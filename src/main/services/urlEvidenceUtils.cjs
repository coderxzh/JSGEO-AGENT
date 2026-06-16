'use strict';

/**
 * URL 证据提取工具
 * 供 sourceDiscoveryService 与 autoLearningVisibilityService 共用，
 * 统一处理豆包助手联网搜索返回中的 URL 提取、域名分类、内容形态猜测等。
 */

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function walk(value, visitor, path = []) {
  if (value === null || value === undefined) return;
  visitor(value, path);
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, [...path, String(index)]));
    return;
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => walk(item, visitor, [...path, key]));
  }
}

function normalizeUrl(value) {
  const text = normalizeText(value)
    .replace(/[)\]}>，。；;、]+$/g, '')
    .replace(/^["'(<\[]+/g, '');
  try {
    const url = new URL(text);
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function sourceNameFromDomain(domain) {
  const text = String(domain || '').toLowerCase();
  const mappings = [
    ['zhihu.com', '知乎'],
    ['baidu.com', '百度'],
    ['baijiahao.baidu.com', '百家号'],
    ['sohu.com', '搜狐'],
    ['toutiao.com', '今日头条'],
    ['xiaohongshu.com', '小红书'],
    ['bilibili.com', '哔哩哔哩'],
    ['weixin.qq.com', '微信公众平台'],
    ['mp.weixin.qq.com', '微信公众平台'],
    ['autohome.com.cn', '汽车之家'],
    ['pcauto.com.cn', '太平洋汽车'],
    ['dongchedi.com', '懂车帝'],
    ['sina.com.cn', '新浪'],
    ['163.com', '网易'],
    ['douyin.com', '抖音'],
  ];
  const matched = mappings.find(([key]) => text.includes(key));
  if (matched) return matched[1];
  return text || '未知来源';
}

function sourceTypeFromDomain(domain) {
  const text = String(domain || '').toLowerCase();
  if (/zhihu|wenda|ask/.test(text)) return 'qa';
  if (/xiaohongshu|douyin|bilibili|weixin|toutiao/.test(text)) return 'social';
  if (/autohome|pcauto|dongchedi/.test(text)) return 'industry_portal';
  if (/baijiahao|sohu|sina|163/.test(text)) return 'media';
  if (/baidu|bing|sogou/.test(text)) return 'search_result';
  return 'other';
}

function guessContentFormat(title = '', url = '') {
  const text = `${title} ${url}`.toLowerCase();
  if (/排行|排名|榜单|top|推荐/.test(text)) return 'ranking';
  if (/测评|评测|review|对比/.test(text)) return 'review';
  if (/案例|施工|客户/.test(text)) return 'case_study';
  if (/避坑|攻略|指南|怎么|如何/.test(text)) return 'guide';
  if (/问答|question|answer/.test(text)) return 'faq';
  return 'guide';
}

function extractUrlsFromText(text, evidenceType, context = {}) {
  const matches = String(text || '').match(/https?:\/\/[^\s"'<>）)】\]]+/gi) || [];
  return matches
    .map((item) => normalizeUrl(item))
    .filter(Boolean)
    .map((url) => {
      const domain = domainFromUrl(url);
      return {
        url,
        domain,
        title: context.title || '',
        source_name: sourceNameFromDomain(domain),
        source_type: sourceTypeFromDomain(domain),
        content_format: guessContentFormat(context.title, url),
        evidence_type: evidenceType,
        question_id: context.question_id || null,
        question: context.question || null,
      };
    });
}

function extractUrlEvidenceFromRaw(rawValue, context = {}) {
  const found = [];
  const seen = new Set();
  walk(rawValue, (value, path) => {
    const key = path[path.length - 1] || '';
    if (typeof value !== 'string') return;
    const lowerKey = key.toLowerCase();
    const title = /title|name/.test(lowerKey) ? value : context.title || '';
    if (/url|link|href|site|source/.test(lowerKey)) {
      const direct = normalizeUrl(value);
      if (direct) {
        const domain = domainFromUrl(direct);
        const entry = {
          url: direct,
          domain,
          title,
          source_name: sourceNameFromDomain(domain),
          source_type: sourceTypeFromDomain(domain),
          content_format: guessContentFormat(title, direct),
          evidence_type: 'tool_observed',
          question_id: context.question_id || null,
          question: context.question || null,
        };
        if (!seen.has(entry.url)) {
          seen.add(entry.url);
          found.push(entry);
        }
        return;
      }
    }
    extractUrlsFromText(value, 'answer_mentioned', { ...context, title }).forEach((entry) => {
      if (!seen.has(entry.url)) {
        seen.add(entry.url);
        found.push(entry);
      }
    });
  });
  return found;
}

function extractSearchQueries(rawEvents = [], fallbackQuestion = '') {
  const queries = [];
  walk(rawEvents, (value, path) => {
    if (typeof value !== 'string') return;
    const key = (path[path.length - 1] || '').toLowerCase();
    if (/query|keyword|search/.test(key) && value.length <= 160 && !/^https?:\/\//i.test(value)) {
      queries.push(normalizeText(value));
    }
  });
  return Array.from(new Set(queries.filter(Boolean))).slice(0, 8)
    .concat(queries.length ? [] : [fallbackQuestion].filter(Boolean));
}

function answerExcerpt(text) {
  return normalizeText(String(text || '').replace(/\n+/g, ' ')).slice(0, 600);
}

module.exports = {
  normalizeText,
  normalizeUrl,
  domainFromUrl,
  sourceNameFromDomain,
  sourceTypeFromDomain,
  guessContentFormat,
  extractUrlsFromText,
  extractUrlEvidenceFromRaw,
  extractSearchQueries,
  answerExcerpt,
  walk,
};
