'use strict';

const crypto = require('node:crypto');
const { getDb } = require('./databaseService.cjs');
const { chatCompletion, parseJsonContent } = require('./llmGateway.cjs');
const { getTaskPolicy } = require('./modelPolicyService.cjs');

const BATCH_SIZE = 20;

function getState(key) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM global_rule_state WHERE key = ?').get(key);
  return row?.value || null;
}

function setState(key, value) {
  const db = getDb();
  db.prepare(`
    INSERT INTO global_rule_state (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, String(value));
}

/**
 * 获取需要处理的文章（增量：只取 last_processed_at 之后的新文章；首次：全量）
 */
function getNewArticles(lastProcessedAt) {
  const db = getDb();
  const baseSql = `
    SELECT ad.*, p.name as project_name
    FROM geo_article_drafts ad
    INNER JOIN projects p ON p.id = ad.project_id
    INNER JOIN publish_orders po ON po.article_id = ad.id
    WHERE po.published_url IS NOT NULL
      AND po.published_url != ''
  `;
  if (!lastProcessedAt) {
    return db.prepare(`${baseSql}`).all();
  }
  return db.prepare(`${baseSql} AND ad.created_at > ?`).all(lastProcessedAt);
}

/**
 * 获取已有的全局规则（title/structure 类型）
 */
function getExistingGlobalRules() {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM evolution_rules
    WHERE scope = 'global' AND status = 'confirmed'
    AND rule_type IN ('title', 'structure')
  `).all();
}

/**
 * 创建全局规则
 */
function createGlobalRule(pattern) {
  const db = getDb();
  const id = `gr-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO evolution_rules (id, project_id, scope, platform, rule_type, content, evidence_count, confidence, status, target_stages, created_at, updated_at)
    VALUES (?, NULL, 'global', ?, ?, ?, 1, ?, 'confirmed', '[4]', datetime('now'), datetime('now'))
  `).run(id, pattern.platform || null, pattern.rule_type, pattern.content, pattern.confidence || 0.7);
  return id;
}

function jsonParse(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildExtractionMessages(article) {
  const draft = jsonParse(article.draft_json, {});
  const content = text(draft.content || draft.body || article.content || '');
  const title = text(draft.title || article.title || '');
  return [
    {
      role: 'system',
      content: '你是 GEO 全局规则提取专家。请分析给定的文章标题和正文，提取可复用的标题模式和结构模式。只输出 JSON，不要任何解释。',
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'extract_global_patterns',
        article: {
          title,
          content: content.slice(0, 4000),
          article_role: draft.article_role || article.article_role || '',
        },
        required_output: {
          patterns: [
            {
              rule_type: 'title | structure',
              content: '模式描述，例如："使用数字+痛点词的标题结构" 或 "先给出行业判断标准、再罗列企业事实证据、最后给出推荐理由的文章结构"',
              confidence: 0.8,
            },
          ],
        },
      }, null, 2),
    },
  ];
}

function normalizePattern(pattern) {
  return {
    rule_type: String(pattern.rule_type || '').toLowerCase(),
    content: text(pattern.content || ''),
    confidence: Math.max(0, Math.min(1, Number(pattern.confidence || 0.7))),
    platform: pattern.platform || null,
  };
}

async function extractPatternsFromArticle(article) {
  try {
    const policy = getTaskPolicy('global_rule_extraction');
    const response = await chatCompletion({
      messages: buildExtractionMessages(article),
      temperature: 0.2,
      maxTokens: 2000,
      provider: policy.provider,
      model: policy.model,
    });
    const parsed = parseJsonContent(response.content);
    const rawPatterns = Array.isArray(parsed?.patterns) ? parsed.patterns : [];
    return rawPatterns
      .map(normalizePattern)
      .filter((p) => p.content && ['title', 'structure'].includes(p.rule_type));
  } catch (err) {
    console.error(`[GlobalRuleService] 文章 ${article.id} 模式提取失败:`, err.message);
    return [];
  }
}

function mergePatternsIntoGlobalRules(patterns, existingRules) {
  let created = 0;
  let updated = 0;

  for (const pattern of patterns) {
    const existing = existingRules.find((rule) =>
      rule.rule_type === pattern.rule_type && rule.content === pattern.content
    );

    if (existing) {
      const newEvidenceCount = (existing.evidence_count || 0) + 1;
      const newConfidence = calculateConfidence(newEvidenceCount);
      updateRuleConfidence(existing.id, newEvidenceCount, newConfidence);
      updated += 1;
    } else {
      createGlobalRule(pattern);
      created += 1;
    }
  }

  return { created, updated };
}

/**
 * 更新规则置信度
 */
function updateRuleConfidence(ruleId, evidenceCount, confidence) {
  const db = getDb();
  db.prepare(`
    UPDATE evolution_rules SET evidence_count = ?, confidence = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(evidenceCount, confidence, ruleId);
}

/**
 * 计算置信度（随证据数递增，上限 0.95）
 */
function calculateConfidence(evidenceCount) {
  return Math.min(0.95, 0.5 + evidenceCount * 0.05);
}

/**
 * 增量处理新文章，提取全局规则
 * @param {Function} extractPatternsFn - 提取模式的异步函数，接收 article 对象，返回模式数组
 * @param {Function} mergePatternsFn - 合并模式的异步函数，接收 (patterns, existingRules)，返回 { created: number }
 */
async function processNewArticles(extractPatternsFn, mergePatternsFn) {
  const lastProcessed = getState('last_processed_at');
  const articles = getNewArticles(lastProcessed);

  if (articles.length === 0) return { processed: 0, rulesCreated: 0 };

  let rulesCreated = 0;
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const allPatterns = [];

    for (const article of batch) {
      try {
        const patterns = await extractPatternsFn(article);
        allPatterns.push(...patterns);
      } catch (err) {
        console.error(`[GlobalRuleService] 文章 ${article.id} 提取失败:`, err.message);
      }
    }

    if (allPatterns.length > 0) {
      const result = await mergePatternsFn(allPatterns, getExistingGlobalRules());
      rulesCreated += result.created || 0;
    }
  }

  const maxCreatedAt = articles.reduce((max, article) => {
    if (!article.created_at) return max;
    return !max || article.created_at > max ? article.created_at : max;
  }, null);
  setState('last_processed_at', maxCreatedAt || new Date().toISOString());

  console.log(`[GlobalRuleService] 处理完成: ${articles.length} 篇文章, ${rulesCreated} 条新规则`);
  return { processed: articles.length, rulesCreated };
}

/**
 * 衰减长期未出现的规则置信度
 */
function decayStaleRules() {
  const db = getDb();
  const staleRules = db.prepare(`
    SELECT * FROM evolution_rules
    WHERE scope = 'global' AND status = 'confirmed'
    AND rule_type IN ('title', 'structure')
    AND updated_at < datetime('now', '-3 days')
  `).all();

  for (const rule of staleRules) {
    const newConfidence = Math.max(0.1, rule.confidence - 0.1);
    if (newConfidence <= 0.1) {
      db.prepare("UPDATE evolution_rules SET status = 'archived', updated_at = datetime('now') WHERE id = ?").run(rule.id);
    } else {
      updateRuleConfidence(rule.id, rule.evidence_count, newConfidence);
    }
  }
}

module.exports = {
  processNewArticles,
  getExistingGlobalRules,
  decayStaleRules,
  getState,
  setState,
  extractPatternsFromArticle,
  mergePatternsIntoGlobalRules,
};
