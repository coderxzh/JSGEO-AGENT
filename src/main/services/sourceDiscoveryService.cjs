const crypto = require('node:crypto');
const { getDb } = require('./databaseService.cjs');
const { chatJson, parseJsonContent, responsesJson, responsesStream } = require('./llmGateway.cjs');
const { getTaskPolicy } = require('./modelPolicyService.cjs');
const knowledgeService = require('./knowledgeService.cjs');
const projectService = require('./projectService.cjs');

const DEFAULT_PLATFORM = 'doubao';

function nowIso() {
  return new Date().toISOString();
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function projectIdFromGeoId(geoProjectId) {
  return String(geoProjectId || '').replace(/^geo-/, '');
}

function platformLabel(platform) {
  const key = String(platform || DEFAULT_PLATFORM);
  if (key === 'doubao') return '豆包';
  if (key === 'deepseek') return 'DeepSeek';
  if (key === 'chatgpt') return 'ChatGPT';
  if (key === 'kimi') return 'Kimi';
  if (key === 'perplexity') return 'Perplexity';
  return key;
}

function getLatestQuestionSet(projectId, platform) {
  return getDb().prepare(`
    SELECT *
    FROM geo_question_sets
    WHERE project_id = ? AND platform = ?
    ORDER BY datetime(created_at) DESC
    LIMIT 1
  `).get(projectId, platform);
}

function normalizeQuestions(questionSetRow, fallbackReport) {
  const source = questionSetRow
    ? parseJson(questionSetRow.questions_json, {})
    : fallbackReport?.questions || fallbackReport?.report || fallbackReport || {};
  const values = [];
  const collect = (items) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      if (typeof item === 'string') {
        values.push(item);
        return;
      }
      if (item && typeof item === 'object') {
        const question = item.question || item.query || item.title || item.topic;
        if (question) values.push(String(question));
      }
    });
  };

  collect(source.ranking_questions);
  collect(source.question_pool);
  collect(source.questions);
  collect(source.high_priority_questions);
  return Array.from(new Set(values.map(normalizeText).filter(Boolean))).slice(0, 12);
}

function profileToPrompt(profile = {}) {
  return [
    ['企业名称', profile.company_name || profile.short_name],
    ['行业', profile.industry],
    ['主营业务', profile.main_business],
    ['产品服务', profile.products_services],
    ['核心优势', profile.core_advantages],
    ['用户痛点', profile.user_pain_points],
    ['信任背书', profile.trust_endorsements],
    ['目标关键词', profile.target_keywords],
  ]
    .filter(([, value]) => normalizeText(value))
    .map(([label, value]) => `${label}: ${normalizeText(value)}`)
    .join('\n');
}

function buildPrompt({ profile, platform, questions }) {
  return [
    {
      role: 'system',
      content: [
        '你是 GEO 高权重信源策略分析师。',
        '任务是找出目标 AI 更容易引用的公开平台、网站和内容形态，用于后续内容资产发布优先级。',
        '不要设计爬虫，不要自动发稿，不要编造具体引用事实。',
        '如果无法确认真实 URL，可以将 source_url 置为空，但 reason 必须说明判断依据。',
        '只返回 JSON，不要输出 Markdown。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `目标 AI 平台: ${platformLabel(platform)} (${platform})`,
        '',
        '企业资料:',
        profileToPrompt(profile) || '暂无完整企业资料',
        '',
        '高优先级问题池:',
        questions.map((question, index) => `${index + 1}. ${question}`).join('\n') || '暂无问题池，请基于企业资料给出通用推荐渠道。',
        '',
        '请完成三件事:',
        '1. 判断该行业、业务类型和问题池下，目标 AI 可能更倾向引用哪些站点、平台或内容形态。',
        '2. 基于问题池推断真实问答/搜索中可能出现的引用来源类型、竞品来源和证据线索。',
        '3. 合并成发布渠道优先级，供后续咨询类、测评类、排行榜类内容生成与发稿选择。',
        '',
        '返回 JSON Schema:',
        JSON.stringify({
          summary: '简短总结',
          ai_recommended_sources: [
            {
              source_name: '平台或网站名称',
              source_url: '可为空',
              source_type: 'qa|media|official_site|review_site|industry_portal|search_result|social|other',
              content_format: 'consulting|review|ranking|case_study|faq|guide|news|other',
              priority_score: 0.85,
              reason: '推荐原因',
              observed_in_answers: '从问题池推断的引用场景或证据线索',
              recommended_topics: ['建议发布主题'],
            },
          ],
          observed_citation_sources: [
            {
              source_name: '已观察或应重点观察的来源类型',
              source_url: '',
              source_type: 'media',
              content_format: 'ranking',
              evidence: '为什么这类来源容易被引用',
            },
          ],
          channel_priorities: [
            {
              source_name: '发布渠道',
              source_url: '',
              source_type: 'qa',
              content_format: 'guide',
              priority_score: 0.9,
              reason: '优先级理由',
              observed_in_answers: 'AI 回答中可能引用的方式',
              recommended_topics: ['主题 A', '主题 B'],
            },
          ],
          content_distribution_strategy: {
            primary_channels: ['优先渠道'],
            content_formats: ['优先内容形态'],
            citation_structure: '建议采用的证据结构',
            next_step: '下一步内容生成建议',
          },
          missing_evidence: ['仍需人工验证的来源或证据'],
        }),
      ].join('\n'),
    },
  ];
}

function numberScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(1, score));
}

function normalizeTopics(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeText).filter(Boolean);
  }
  const text = normalizeText(value);
  return text ? [text] : [];
}

function normalizeChannel(item = {}, index = 0) {
  return {
    source_name: normalizeText(item.source_name || item.name || item.platform || item.channel) || `候选信源 ${index + 1}`,
    source_url: normalizeText(item.source_url || item.url) || null,
    source_type: normalizeText(item.source_type || item.type) || 'other',
    content_format: normalizeText(item.content_format || item.format) || 'guide',
    priority_score: numberScore(item.priority_score ?? item.score ?? item.confidence ?? 0.5),
    reason: normalizeText(item.reason || item.evidence || item.description),
    observed_in_answers: normalizeText(item.observed_in_answers || item.observation || item.evidence),
    recommended_topics: normalizeTopics(item.recommended_topics || item.topics),
  };
}

function normalizeDiscovery(raw = {}) {
  const recommended = Array.isArray(raw.ai_recommended_sources) ? raw.ai_recommended_sources : [];
  const observed = Array.isArray(raw.observed_citation_sources) ? raw.observed_citation_sources : [];
  const channels = Array.isArray(raw.channel_priorities) && raw.channel_priorities.length
    ? raw.channel_priorities
    : recommended;

  const channelPriorities = channels
    .map(normalizeChannel)
    .sort((a, b) => b.priority_score - a.priority_score);

  return {
    summary: normalizeText(raw.summary) || '已完成高权重信源发现。',
    status: 'completed',
    ai_recommended_sources: recommended.map(normalizeChannel),
    observed_citation_sources: observed.map(normalizeChannel),
    verified_observed_sources: Array.isArray(raw.verified_observed_sources)
      ? raw.verified_observed_sources.map(normalizeChannel)
      : [],
    candidate_sources: channelPriorities,
    channel_priorities: channelPriorities,
    source_scores: channelPriorities.map((item) => ({
      source: item.source_name,
      score: item.priority_score,
      reason: item.reason,
    })),
    content_distribution_strategy: raw.content_distribution_strategy || {},
    missing_evidence: Array.isArray(raw.missing_evidence)
      ? raw.missing_evidence.map(normalizeText).filter(Boolean)
      : [],
  };
}

function rowToDiscovery(row) {
  if (!row) return null;
  return {
    id: row.id,
    geo_project_id: `geo-${row.project_id}`,
    enterprise_project_id: row.project_id,
    project_id: row.project_id,
    question_set_id: row.question_set_id || null,
    platform: row.platform,
    status: row.status,
    source_name: row.source_name || null,
    source_url: row.source_url || null,
    source_type: row.source_type || null,
    content_format: row.content_format || null,
    priority_score: Number(row.priority_score || 0),
    reason: row.reason || null,
    observed_in_answers: row.observed_in_answers || null,
    recommended_topics: parseJson(row.recommended_topics, []),
    discovery: parseJson(row.discovery_json, {}),
    confirmed_at: row.confirmed_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function insertWorkflowEvent(db, discovery) {
  const timestamp = nowIso();
  db.prepare(`
    INSERT INTO workflow_events (
      id, project_id, stage_key, event_type, status, title, content,
      artifact_type, artifact_id, metadata_json, created_at, updated_at
    )
    VALUES (
      @id, @project_id, 'stage_3', 'source_discovery_completed', @status, @title, @content,
      'geo_source_discovery', @artifact_id, @metadata_json, @created_at, @updated_at
    )
  `).run({
    id: crypto.randomUUID(),
    project_id: discovery.project_id,
    status: discovery.status,
    title: '高权重信源发现完成',
    content: discovery.discovery.summary || '',
    artifact_id: discovery.id,
    metadata_json: JSON.stringify({ platform: discovery.platform, question_set_id: discovery.question_set_id }),
    created_at: timestamp,
    updated_at: timestamp,
  });
}

async function generateSourceDiscovery({ geoProjectId, projectId, questionSetId = null, platform = DEFAULT_PLATFORM, fallbackReport = null } = {}) {
  const enterpriseProjectId = projectId || projectIdFromGeoId(geoProjectId);
  if (!enterpriseProjectId) throw new Error('projectId is required.');
  projectService.getProject(enterpriseProjectId);

  const profileResponse = knowledgeService.getKnowledgeProfile(enterpriseProjectId);
  const profile = profileResponse.profile || {};
  const questionSetRow = questionSetId
    ? getDb().prepare('SELECT * FROM geo_question_sets WHERE id = ? AND project_id = ?').get(questionSetId, enterpriseProjectId)
    : getLatestQuestionSet(enterpriseProjectId, platform);
  const questions = normalizeQuestions(questionSetRow, fallbackReport);
  const messages = buildPrompt({ profile, platform, questions });
  const policy = getTaskPolicy('source_discovery', { platform });
  const completion = policy.api_family === 'chat_completions'
    ? await chatJson({
        messages,
        temperature: 0.2,
        maxTokens: 5000,
        provider: policy.provider,
        model: policy.model,
      })
    : await responsesJson({
        messages,
        temperature: 0.2,
        maxTokens: 5000,
        provider: policy.provider,
        model: policy.model,
        networkMode: policy.network_mode,
        deepThinking: policy.deep_thinking,
      });
  const discoveryJson = normalizeDiscovery(completion.json);
  discoveryJson.extraction_model = completion.model;
  discoveryJson.extraction_provider = completion.provider;
  discoveryJson.task_policy = {
    task_type: policy.task_type,
    api_family: policy.api_family,
    network_mode: policy.network_mode,
    deep_thinking: policy.deep_thinking,
  };
  discoveryJson.input_questions = questions;

  const primary = discoveryJson.channel_priorities[0] || {};
  const timestamp = nowIso();
  const row = {
    id: crypto.randomUUID(),
    project_id: enterpriseProjectId,
    question_set_id: questionSetRow?.id || questionSetId || fallbackReport?.id || null,
    platform,
    status: 'completed',
    source_name: primary.source_name || null,
    source_url: primary.source_url || null,
    source_type: primary.source_type || null,
    content_format: primary.content_format || null,
    priority_score: primary.priority_score || 0,
    reason: primary.reason || null,
    observed_in_answers: primary.observed_in_answers || null,
    recommended_topics: JSON.stringify(primary.recommended_topics || []),
    discovery_json: JSON.stringify(discoveryJson),
    created_at: timestamp,
    updated_at: timestamp,
  };

  const db = getDb();
  db.transaction(() => {
    db.prepare(`
      INSERT INTO geo_source_discoveries (
        id, project_id, question_set_id, platform, status, source_name, source_url,
        source_type, content_format, priority_score, reason, observed_in_answers,
        recommended_topics, discovery_json, created_at, updated_at
      )
      VALUES (
        @id, @project_id, @question_set_id, @platform, @status, @source_name, @source_url,
        @source_type, @content_format, @priority_score, @reason, @observed_in_answers,
        @recommended_topics, @discovery_json, @created_at, @updated_at
      )
    `).run(row);
    insertWorkflowEvent(db, { ...row, discovery: discoveryJson });
  })();

  return rowToDiscovery({ ...row, confirmed_at: null });
}

async function generateSourceDiscoveryStream(params = {}, onEvent = null) {
  const geoProjectId = params.geoProjectId || params.geo_project_id;
  const platform = params.platform || DEFAULT_PLATFORM;
  const enterpriseProjectId = params.projectId || projectIdFromGeoId(geoProjectId);
  if (!enterpriseProjectId) throw new Error('projectId is required.');
  projectService.getProject(enterpriseProjectId);

  const profileResponse = knowledgeService.getKnowledgeProfile(enterpriseProjectId);
  const profile = profileResponse.profile || {};
  const questionSetRow = params.questionSetId
    ? getDb().prepare('SELECT * FROM geo_question_sets WHERE id = ? AND project_id = ?').get(params.questionSetId, enterpriseProjectId)
    : getLatestQuestionSet(enterpriseProjectId, platform);
  const questions = normalizeQuestions(questionSetRow, params.fallbackReport);
  const messages = buildPrompt({ profile, platform, questions });
  const policy = getTaskPolicy('source_discovery', { platform });

  onEvent?.({
    type: 'status',
    step_index: 0,
    step_label: 'Doubao Assistant Search',
    text: 'Using Doubao Assistant online search with deep reasoning to analyze source authority and channel priority.',
  });
  const streamResult = await responsesStream({
    messages,
    temperature: 0.2,
    maxTokens: 5000,
    provider: policy.provider,
    model: policy.model,
    networkMode: policy.network_mode,
    deepThinking: policy.deep_thinking,
    onEvent: (event) => {
      if (event.type === 'reasoning_delta') {
        onEvent?.({ type: 'summary_delta', text: event.text });
      }
      if (event.type === 'delta') {
        onEvent?.({ type: 'summary_delta', text: event.text });
      }
    },
  });

  const discoveryJson = normalizeDiscovery(parseJsonContent(streamResult.content));
  discoveryJson.extraction_model = streamResult.model;
  discoveryJson.extraction_provider = streamResult.provider;
  discoveryJson.task_policy = {
    task_type: policy.task_type,
    api_family: policy.api_family,
    network_mode: policy.network_mode,
    deep_thinking: policy.deep_thinking,
  };
  discoveryJson.reasoning_content = streamResult.reasoning_content;
  discoveryJson.input_questions = questions;

  const primary = discoveryJson.channel_priorities[0] || {};
  const timestamp = nowIso();
  const row = {
    id: crypto.randomUUID(),
    project_id: enterpriseProjectId,
    question_set_id: questionSetRow?.id || params.questionSetId || params.fallbackReport?.id || null,
    platform,
    status: 'completed',
    source_name: primary.source_name || null,
    source_url: primary.source_url || null,
    source_type: primary.source_type || null,
    content_format: primary.content_format || null,
    priority_score: primary.priority_score || 0,
    reason: primary.reason || null,
    observed_in_answers: primary.observed_in_answers || null,
    recommended_topics: JSON.stringify(primary.recommended_topics || []),
    discovery_json: JSON.stringify(discoveryJson),
    created_at: timestamp,
    updated_at: timestamp,
  };

  const db = getDb();
  db.transaction(() => {
    db.prepare(`
      INSERT INTO geo_source_discoveries (
        id, project_id, question_set_id, platform, status, source_name, source_url,
        source_type, content_format, priority_score, reason, observed_in_answers,
        recommended_topics, discovery_json, created_at, updated_at
      )
      VALUES (
        @id, @project_id, @question_set_id, @platform, @status, @source_name, @source_url,
        @source_type, @content_format, @priority_score, @reason, @observed_in_answers,
        @recommended_topics, @discovery_json, @created_at, @updated_at
      )
    `).run(row);
    insertWorkflowEvent(db, { ...row, discovery: discoveryJson });
  })();

  const discovery = rowToDiscovery({ ...row, confirmed_at: null });
  onEvent?.({ type: 'result', source_discovery: discovery });
  return discovery;
}

function getSourceDiscovery(discoveryId) {
  if (!discoveryId) throw new Error('discoveryId is required.');
  const row = getDb().prepare('SELECT * FROM geo_source_discoveries WHERE id = ?').get(discoveryId);
  if (!row) throw new Error('高权重信源发现结果不存在。');
  return rowToDiscovery(row);
}

function getLatestSourceDiscovery(geoProjectId, platform = DEFAULT_PLATFORM) {
  const projectId = projectIdFromGeoId(geoProjectId);
  if (!projectId) throw new Error('geoProjectId is required.');
  const row = getDb().prepare(`
    SELECT *
    FROM geo_source_discoveries
    WHERE project_id = ? AND platform = ?
    ORDER BY datetime(created_at) DESC
    LIMIT 1
  `).get(projectId, platform);
  if (!row) throw new Error('暂无高权重信源发现结果。');
  return rowToDiscovery(row);
}

function listSourceDiscoveries(projectId, platform = null) {
  if (!projectId) throw new Error('projectId is required.');
  projectService.getProject(projectId);
  const rows = platform
    ? getDb().prepare(`
        SELECT * FROM geo_source_discoveries
        WHERE project_id = ? AND platform = ?
        ORDER BY datetime(created_at) DESC
      `).all(projectId, platform)
    : getDb().prepare(`
        SELECT * FROM geo_source_discoveries
        WHERE project_id = ?
        ORDER BY datetime(created_at) DESC
      `).all(projectId);
  return { discoveries: rows.map(rowToDiscovery) };
}

function confirmSourceDiscovery(discoveryId) {
  if (!discoveryId) throw new Error('discoveryId is required.');
  const timestamp = nowIso();
  const result = getDb().prepare(`
    UPDATE geo_source_discoveries
    SET status = 'confirmed',
        confirmed_at = COALESCE(confirmed_at, @confirmed_at),
        updated_at = @updated_at
    WHERE id = @id
  `).run({ id: discoveryId, confirmed_at: timestamp, updated_at: timestamp });
  if (!result.changes) throw new Error('高权重信源发现结果不存在。');
  return getSourceDiscovery(discoveryId);
}

module.exports = {
  confirmSourceDiscovery,
  generateSourceDiscovery,
  generateSourceDiscoveryStream,
  getLatestSourceDiscovery,
  getSourceDiscovery,
  listSourceDiscoveries,
};
