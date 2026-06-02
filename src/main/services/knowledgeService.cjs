const crypto = require('node:crypto');
const { normalizeText, parseAssets } = require('../parsers/documentParser.cjs');
const { getDb } = require('./databaseService.cjs');
const { extractKnowledgeDraft, extractKnowledgeDraftStream } = require('./knowledgeExtractionService.cjs');
const projectService = require('./projectService.cjs');

const PROFILE_ENTRY_TYPE = 'enterprise_profile';
const ASSET_ENTRY_TYPE = 'asset';
const UNKNOWN_COMPANY_NAME = '待确认企业名称';

const PROFILE_FIELDS = [
  ['company_name', '企业名称'],
  ['short_name', '企业简称'],
  ['industry', '行业'],
  ['main_business', '主营业务'],
  ['official_website', '官网'],
  ['official_media', '官方媒体'],
  ['detailed_intro', '详细介绍'],
  ['brand_story', '品牌故事'],
  ['products_services', '产品服务'],
  ['product_features', '产品特点'],
  ['user_pain_points', '用户痛点'],
  ['trust_endorsements', '信任背书'],
  ['brand_authorization_pricing', '授权与价格'],
  ['cases', '案例'],
  ['business_regions', '服务区域'],
  ['customer_service_phone', '客服电话'],
  ['current_pain_points', '当前痛点'],
  ['core_advantages', '核心优势'],
  ['extra_info', '补充信息'],
  ['image_notes', '图片资料说明'],
  ['target_keywords', '目标关键词'],
];

const REQUIRED_FIELDS = [
  ['company_name', '企业名称'],
  ['main_business', '主营业务'],
  ['products_services', '产品服务'],
  ['user_pain_points', '用户痛点'],
  ['core_advantages', '核心优势'],
  ['trust_endorsements', '信任背书'],
  ['cases', '案例'],
  ['target_keywords', '目标关键词'],
];

const FACT_PATTERNS = [
  { field: 'company_name', label: '企业名称', pattern: /(?:公司名称|企业名称|品牌名称|名称)[:：]\s*([^\n，。；;]{2,80})/i, confidence: 0.9 },
  { field: 'short_name', label: '企业简称', pattern: /(?:公司简称|企业简称|简称)[:：]\s*([^\n，。；;]{2,60})/i, confidence: 0.82 },
  { field: 'industry', label: '行业', pattern: /(?:所属行业|行业|领域)[:：]\s*([^\n。；;]{2,120})/i, confidence: 0.78 },
  { field: 'main_business', label: '主营业务', pattern: /(?:主营业务|业务范围|核心业务)[:：]\s*([^\n]{4,500})/i, confidence: 0.84 },
  { field: 'products_services', label: '产品服务', pattern: /(?:产品服务|产品与服务|服务内容|解决方案)[:：]\s*([^\n]{4,700})/i, confidence: 0.8 },
  { field: 'product_features', label: '产品特点', pattern: /(?:产品特点|功能特点|服务特点|特点)[:：]\s*([^\n]{4,700})/i, confidence: 0.72 },
  { field: 'user_pain_points', label: '用户痛点', pattern: /(?:用户痛点|客户痛点|解决痛点|痛点)[:：]\s*([^\n]{4,700})/i, confidence: 0.72 },
  { field: 'trust_endorsements', label: '信任背书', pattern: /(?:信任背书|资质|认证|荣誉|授权|合作伙伴)[:：]\s*([^\n]{4,700})/i, confidence: 0.72 },
  { field: 'cases', label: '案例', pattern: /(?:客户案例|成功案例|案例)[:：]\s*([^\n]{4,700})/i, confidence: 0.74 },
  { field: 'business_regions', label: '服务区域', pattern: /(?:服务区域|覆盖区域|业务区域|地区)[:：]\s*([^\n]{2,300})/i, confidence: 0.7 },
  { field: 'core_advantages', label: '核心优势', pattern: /(?:核心优势|竞争优势|优势)[:：]\s*([^\n]{4,700})/i, confidence: 0.74 },
  { field: 'target_keywords', label: '目标关键词', pattern: /(?:目标关键词|关键词|核心关键词)[:：]\s*([^\n]{2,300})/i, confidence: 0.7 },
];

function nowIso() {
  return new Date().toISOString();
}

function jsonString(value) {
  return JSON.stringify(value ?? {});
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && String(entryValue).trim() !== '')
  );
}

function profileCompanyName(profile = {}) {
  return normalizeText(profile.company_name || profile.short_name || UNKNOWN_COMPANY_NAME);
}

function profileDescription(profile = {}) {
  return normalizeText(profile.main_business || profile.detailed_intro || profile.products_services || profile.core_advantages || '');
}

function projectExists(projectId) {
  if (!projectId) return false;
  return Boolean(getDb().prepare('SELECT id FROM projects WHERE id = ?').get(projectId));
}

function normalizeProfile(profile = {}) {
  const normalized = compactObject({
    id: profile.id,
    project_id: profile.project_id,
    company_name: profileCompanyName(profile),
    short_name: profile.short_name,
    industry: profile.industry,
    main_business: profile.main_business,
    official_website: profile.official_website,
    official_media: profile.official_media,
    detailed_intro: profile.detailed_intro,
    brand_story: profile.brand_story,
    products_services: profile.products_services,
    product_features: profile.product_features,
    user_pain_points: profile.user_pain_points,
    trust_endorsements: profile.trust_endorsements,
    brand_authorization_pricing: profile.brand_authorization_pricing,
    cases: profile.cases,
    business_regions: profile.business_regions,
    customer_service_phone: profile.customer_service_phone,
    current_pain_points: profile.current_pain_points,
    core_advantages: profile.core_advantages,
    extra_info: profile.extra_info,
    image_notes: profile.image_notes,
    target_keywords: profile.target_keywords,
    generated_long_tail_keywords: profile.generated_long_tail_keywords,
  });
  normalized.company_name = profileCompanyName(normalized);
  return normalized;
}

function buildProfileContent(profile = {}) {
  return PROFILE_FIELDS
    .filter(([field]) => normalizeText(profile[field]))
    .map(([field, label]) => `## ${label}\n${normalizeText(profile[field])}`)
    .join('\n\n');
}

function rowToProfile(row) {
  if (!row) return null;
  const profile = normalizeProfile(parseJson(row.profile_json, {}));
  const companyName = profile.company_name || row.name;
  return {
    ...profile,
    id: row.project_id,
    project_id: row.project_id,
    company_name: companyName,
    short_name: profile.short_name || companyName,
    main_business: profile.main_business || row.description || null,
    detailed_intro: profile.detailed_intro || row.description || null,
    entry_count: row.entry_count || 0,
    created_at: row.profile_created_at || row.created_at,
    updated_at: row.profile_updated_at || row.updated_at,
  };
}

function rowToEntry(row) {
  return {
    id: row.id,
    project_id: row.project_id,
    parent_id: row.entry_id || null,
    title: row.title || '知识片段',
    content: row.content || '',
    source_type: row.type || row.source_type || 'manual',
    metadata: parseJson(row.metadata_json, {}),
    chunk_index: Number(row.chunk_index || 0),
    embedding_status: row.embedding_status || 'indexed',
    error_message: row.error_message || null,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
  };
}

function getIndexStatus(projectId = null) {
  const db = getDb();
  if (!projectId) {
    return {
      project_id: null,
      embedding_model: process.env.ARK_EMBEDDING_MODEL || 'not-configured',
      vector_backend: 'fts',
      embedding_backend: process.env.ARK_API_KEY ? 'volcengine-ark-pending' : 'disabled',
      pending: 0,
      indexed: 0,
      failed: 0,
      asset_count: 0,
      assets: [],
    };
  }

  const chunkCount = db.prepare('SELECT COUNT(*) AS count FROM knowledge_chunks WHERE project_id = ?').get(projectId).count;
  const entryCount = db.prepare('SELECT COUNT(*) AS count FROM knowledge_entries WHERE project_id = ?').get(projectId).count;
  return {
    project_id: projectId,
    embedding_model: process.env.ARK_EMBEDDING_MODEL || 'not-configured',
    vector_backend: 'fts',
    embedding_backend: process.env.ARK_API_KEY ? 'volcengine-ark-pending' : 'disabled',
    pending: 0,
    indexed: chunkCount,
    failed: 0,
    asset_count: entryCount,
    assets: [],
  };
}

function ensureProjectForProfile(profile) {
  const requestedProjectId = normalizeText(profile.project_id);
  if (requestedProjectId && projectExists(requestedProjectId)) return requestedProjectId;

  const db = getDb();
  const timestamp = nowIso();
  const projectId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO projects (id, name, description, status, created_at, updated_at)
    VALUES (@id, @name, @description, 'active', @created_at, @updated_at)
  `).run({
    id: projectId,
    name: profileCompanyName(profile),
    description: profileDescription(profile) || null,
    created_at: timestamp,
    updated_at: timestamp,
  });
  return projectId;
}

function updateProjectSummary(projectId, profile) {
  getDb().prepare(`
    UPDATE projects
    SET name = @name,
        description = @description,
        updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: projectId,
    name: profileCompanyName(profile),
    description: profileDescription(profile) || null,
    updated_at: nowIso(),
  });
}

function splitTextIntoChunks(content, maxLength = 900, overlap = 120) {
  const text = normalizeText(content);
  if (!text) return [];

  const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  paragraphs.forEach((paragraph) => {
    if ((current + '\n\n' + paragraph).trim().length <= maxLength) {
      current = (current ? `${current}\n\n${paragraph}` : paragraph).trim();
      return;
    }
    if (current) chunks.push(current);
    if (paragraph.length <= maxLength) {
      current = paragraph;
      return;
    }
    for (let index = 0; index < paragraph.length; index += maxLength - overlap) {
      chunks.push(paragraph.slice(index, index + maxLength).trim());
    }
    current = '';
  });
  if (current) chunks.push(current);
  return chunks;
}

function contentHash(projectId, entryId, chunkContent, chunkIndex) {
  return crypto.createHash('sha256')
    .update(`${projectId}:${entryId}:${chunkIndex}:${chunkContent}`)
    .digest('hex');
}

function deleteFtsRowsForEntries(db, projectId, type = null) {
  const rows = type
    ? db.prepare('SELECT kc.id FROM knowledge_chunks kc JOIN knowledge_entries ke ON ke.id = kc.entry_id WHERE kc.project_id = ? AND ke.type = ?').all(projectId, type)
    : db.prepare('SELECT id FROM knowledge_chunks WHERE project_id = ?').all(projectId);
  const deleteFts = db.prepare('DELETE FROM knowledge_chunks_fts WHERE id = ?');
  rows.forEach((row) => deleteFts.run(row.id));
}

function insertEntryWithChunks(db, { projectId, type, title, content, metadata = {} }) {
  const timestamp = nowIso();
  const entryId = crypto.randomUUID();
  const cleanContent = normalizeText(content);
  if (!cleanContent) throw new Error('知识条目内容不能为空。');

  db.prepare(`
    INSERT INTO knowledge_entries (id, project_id, type, title, content, metadata_json, created_at, updated_at)
    VALUES (@id, @project_id, @type, @title, @content, @metadata_json, @created_at, @updated_at)
  `).run({
    id: entryId,
    project_id: projectId,
    type,
    title: title || '知识条目',
    content: cleanContent,
    metadata_json: jsonString(metadata),
    created_at: timestamp,
    updated_at: timestamp,
  });

  const insertChunk = db.prepare(`
    INSERT OR IGNORE INTO knowledge_chunks (id, project_id, entry_id, title, content, content_hash, metadata_json, created_at)
    VALUES (@id, @project_id, @entry_id, @title, @content, @content_hash, @metadata_json, @created_at)
  `);
  const insertFts = db.prepare(`
    INSERT INTO knowledge_chunks_fts (id, project_id, title, content)
    VALUES (@id, @project_id, @title, @content)
  `);

  splitTextIntoChunks(cleanContent).forEach((chunkContent, chunkIndex) => {
    const chunkId = crypto.randomUUID();
    const result = insertChunk.run({
      id: chunkId,
      project_id: projectId,
      entry_id: entryId,
      title,
      content: chunkContent,
      content_hash: contentHash(projectId, entryId, chunkContent, chunkIndex),
      metadata_json: jsonString({ ...metadata, chunk_index: chunkIndex }),
      created_at: timestamp,
    });
    if (result.changes > 0) {
      insertFts.run({ id: chunkId, project_id: projectId, title, content: chunkContent });
    }
  });

  return entryId;
}

function listEntries(projectId, limit = 100) {
  if (!projectId) return { entries: [], total: 0 };
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) AS count FROM knowledge_entries WHERE project_id = ?').get(projectId).count;
  const rows = db.prepare(`
    SELECT id, project_id, type, title, content, metadata_json, 0 AS chunk_index,
           'indexed' AS embedding_status, NULL AS error_message, created_at, updated_at
    FROM knowledge_entries
    WHERE project_id = ?
    ORDER BY datetime(updated_at) DESC
    LIMIT ?
  `).all(projectId, Number(limit || 100));
  return { entries: rows.map(rowToEntry), total };
}

function getProfileRow(projectId) {
  return getDb().prepare(`
    SELECT
      p.id AS project_id,
      p.name,
      p.description,
      p.created_at,
      p.updated_at,
      ep.profile_json,
      ep.created_at AS profile_created_at,
      ep.updated_at AS profile_updated_at,
      COALESCE(entry_counts.entry_count, 0) AS entry_count
    FROM projects p
    LEFT JOIN enterprise_profiles ep ON ep.project_id = p.id
    LEFT JOIN (
      SELECT project_id, COUNT(*) AS entry_count
      FROM knowledge_entries
      GROUP BY project_id
    ) entry_counts ON entry_counts.project_id = p.id
    WHERE p.id = ?
  `).get(projectId);
}

function getKnowledgeProfile(projectId) {
  projectService.getProject(projectId);
  const profile = rowToProfile(getProfileRow(projectId));
  const entriesResponse = listEntries(projectId);
  return {
    profile,
    entries: entriesResponse.entries,
    total: entriesResponse.total,
    index_status: getIndexStatus(projectId),
  };
}

function saveProfile(profileInput = {}) {
  const db = getDb();
  const timestamp = nowIso();
  const profile = normalizeProfile(profileInput);
  const tx = db.transaction(() => {
    const projectId = ensureProjectForProfile(profile);
    profile.project_id = projectId;
    profile.id = projectId;
    updateProjectSummary(projectId, profile);
    db.prepare(`
      INSERT INTO enterprise_profiles (project_id, profile_json, source_draft_id, created_at, updated_at)
      VALUES (@project_id, @profile_json, @source_draft_id, @created_at, @updated_at)
      ON CONFLICT(project_id) DO UPDATE SET
        profile_json = excluded.profile_json,
        updated_at = excluded.updated_at
    `).run({
      project_id: projectId,
      profile_json: jsonString(profile),
      source_draft_id: profile.source_draft_id || null,
      created_at: timestamp,
      updated_at: timestamp,
    });
    deleteFtsRowsForEntries(db, projectId, PROFILE_ENTRY_TYPE);
    db.prepare('DELETE FROM knowledge_entries WHERE project_id = ? AND type = ?').run(projectId, PROFILE_ENTRY_TYPE);
    insertEntryWithChunks(db, {
      projectId,
      type: PROFILE_ENTRY_TYPE,
      title: `${profileCompanyName(profile)} 企业资料`,
      content: buildProfileContent(profile),
      metadata: { source: 'enterprise_profile' },
    });
    return projectId;
  });
  return getKnowledgeProfile(tx());
}

function saveEnterpriseProfile(profileInput = {}) {
  return saveProfile(profileInput);
}

function updateKnowledgeProfile(projectId, profileInput = {}) {
  if (!projectId) throw new Error('projectId is required.');
  projectService.getProject(projectId);
  return saveProfile({ ...profileInput, project_id: projectId });
}

function createKnowledgeEntry(entry = {}) {
  const projectId = normalizeText(entry.project_id);
  if (!projectId) throw new Error('project_id is required.');
  projectService.getProject(projectId);
  const db = getDb();
  db.transaction(() => {
    insertEntryWithChunks(db, {
      projectId,
      type: entry.source_type || 'manual',
      title: normalizeText(entry.title) || '手动知识条目',
      content: entry.content,
      metadata: { source: 'manual' },
    });
    updateProjectSummary(projectId, rowToProfile(getProfileRow(projectId)) || { company_name: projectId });
  })();
  return listEntries(projectId);
}

function sourceSnippet(text, start, length = 180) {
  return normalizeText(text).slice(Math.max(0, start - 40), start + length).trim();
}

function findFactsInDocument(document) {
  const text = document.text || '';
  const facts = [];
  FACT_PATTERNS.forEach((rule) => {
    const match = text.match(rule.pattern);
    if (!match?.[1]) return;
    const index = match.index ?? 0;
    facts.push({
      id: crypto.randomUUID(),
      field: rule.field,
      label: rule.label,
      value: normalizeText(match[1]),
      source_file: document.filename,
      source_document_id: document.id,
      quote: sourceSnippet(text, index),
      confidence: rule.confidence,
      extraction: 'local-pattern',
    });
  });
  const websiteMatches = text.match(/https?:\/\/[^\s，。；;]+/gi) || [];
  if (websiteMatches[0]) {
    facts.push({
      id: crypto.randomUUID(),
      field: 'official_website',
      label: '官网',
      value: websiteMatches[0],
      source_file: document.filename,
      source_document_id: document.id,
      quote: websiteMatches[0],
      confidence: 0.68,
      extraction: 'local-pattern',
    });
  }
  return facts;
}

function collectFacts(documents = [], message = '') {
  const messageDocument = normalizeText(message)
    ? [{
        id: 'user-message',
        filename: '用户说明',
        content_type: 'text/plain',
        text: normalizeText(message),
        text_length: normalizeText(message).length,
        status: 'parsed',
        error_message: null,
      }]
    : [];
  return [...messageDocument, ...documents]
    .filter((document) => document.status === 'parsed' && document.text)
    .flatMap(findFactsInDocument);
}

function buildSourceQuotes(documents = [], facts = []) {
  const quotes = [];
  const seen = new Set();
  facts.forEach((fact) => {
    const key = `${fact.source_document_id}:${fact.quote}`;
    if (seen.has(key)) return;
    seen.add(key);
    quotes.push({
      id: crypto.randomUUID(),
      source_file: fact.source_file,
      source_document_id: fact.source_document_id,
      quote: fact.quote,
      fields: [fact.field],
    });
  });
  documents
    .filter((document) => document.status === 'parsed' && document.text)
    .slice(0, 3)
    .forEach((document) => {
      const key = `${document.id}:preview`;
      if (seen.has(key)) return;
      seen.add(key);
      quotes.push({
        id: crypto.randomUUID(),
        source_file: document.filename,
        source_document_id: document.id,
        quote: sourceSnippet(document.text, 0, 220),
        fields: ['source_preview'],
      });
    });
  return quotes;
}

function firstDocumentParagraph(documents = [], message = '') {
  const corpus = [message, ...documents.map((document) => document.text)].filter(Boolean).join('\n\n');
  return normalizeText(corpus).split(/\n{2,}|。/).map((item) => item.trim()).find(Boolean) || '';
}

function buildProfileFromFacts(facts = [], documents = [], message = '', projectId = null) {
  const profile = {};
  facts.forEach((fact) => {
    if (!profile[fact.field] || fact.confidence > 0.8) {
      profile[fact.field] = fact.value;
    }
  });
  const corpus = [message, ...documents.map((document) => document.text)].filter(Boolean).join('\n\n');
  const websiteMatch = corpus.match(/https?:\/\/[^\s，。；;]+/i);
  const firstParagraph = firstDocumentParagraph(documents, message);
  return normalizeProfile({
    project_id: projectId,
    company_name: profile.company_name || UNKNOWN_COMPANY_NAME,
    short_name: profile.short_name || (profile.company_name && profile.company_name !== UNKNOWN_COMPANY_NAME ? profile.company_name : null),
    official_website: profile.official_website || websiteMatch?.[0] || null,
    main_business: profile.main_business || firstParagraph.slice(0, 300) || null,
    detailed_intro: firstParagraph ? normalizeText(corpus).slice(0, 3000) : null,
    ...profile,
  });
}

function missingFieldsForProfile(profile = {}) {
  return REQUIRED_FIELDS
    .filter(([field]) => !normalizeText(profile[field]) || profile[field] === UNKNOWN_COMPANY_NAME)
    .map(([, label]) => label);
}

function buildFieldReviews(profile = {}, facts = []) {
  return REQUIRED_FIELDS.map(([field, label]) => {
    const relatedFacts = facts.filter((fact) => fact.field === field);
    const value = normalizeText(profile[field]);
    return {
      field,
      label,
      value: value && value !== UNKNOWN_COMPANY_NAME ? value : '',
      confirmed: false,
      confidence: relatedFacts.length ? Math.max(...relatedFacts.map((fact) => fact.confidence || 0)) : 0,
      source_fact_ids: relatedFacts.map((fact) => fact.id),
      warning: value && value !== UNKNOWN_COMPANY_NAME ? null : '需要人工补充或确认。',
    };
  });
}

function buildLocalExtraction(documents, messageText, projectId) {
  const facts = collectFacts(documents, messageText);
  const profile = buildProfileFromFacts(facts, documents, messageText, projectId);
  const missingFields = missingFieldsForProfile(profile);
  return {
    facts,
    profile,
    missing_fields: missingFields,
    field_reviews: buildFieldReviews(profile, facts),
    source_quotes: buildSourceQuotes(documents, facts),
    warnings: [],
    extraction_status: facts.length ? (missingFields.length ? 'needs_review' : 'completed') : 'needs_review',
    extraction_model: 'local-pattern-extractor',
    extraction_provider: 'local',
  };
}

async function createKnowledgeDraft(payload = {}) {
  const db = getDb();
  const draftId = crypto.randomUUID();
  const timestamp = nowIso();
  const parsedAssets = parseAssets(payload.assets || []);
  const assets = parsedAssets.map(({ asset }) => ({ ...asset, draft_id: draftId }));
  const documents = parsedAssets.map(({ document }) => document);
  const messageText = normalizeText(payload.message);
  const documentText = documents.map((document) => document.text ? `# ${document.filename}\n${document.text}` : '').filter(Boolean).join('\n\n');
  const inputText = [messageText, documentText].filter(Boolean).join('\n\n');

  if (!normalizeText(inputText)) {
    throw new Error('未解析到可用于建库的企业资料。');
  }

  const extraction = payload.debug_local_fallback === true
    ? buildLocalExtraction(documents, messageText, payload.project_id || null)
    : await extractKnowledgeDraft({ documents, message: messageText, projectId: payload.project_id || null });

  const facts = extraction.facts || [];
  const profile = normalizeProfile({
    ...(extraction.profile || {}),
    project_id: projectExists(payload.project_id) ? payload.project_id : extraction.profile?.project_id || null,
  });
  const missingFields = extraction.missing_fields || missingFieldsForProfile(profile);
  const fieldReviews = extraction.field_reviews || buildFieldReviews(profile, facts);
  const sourceQuotes = extraction.source_quotes || buildSourceQuotes(documents, facts);
  const warnings = [
    ...(extraction.warnings || []),
    ...assets.filter((asset) => asset.status === 'failed').map((asset) => `${asset.filename}: ${asset.error_message}`),
    ...(missingFields.length ? [`仍需补充字段：${missingFields.join('、')}`] : []),
  ];
  const sourceSummary = {
    text_length: inputText.length,
    asset_count: assets.length,
    parsed_asset_count: assets.filter((asset) => asset.status !== 'failed').length,
    failed_asset_count: assets.filter((asset) => asset.status === 'failed').length,
    fact_count: facts.length,
    quote_count: sourceQuotes.length,
  };

  db.prepare(`
    INSERT INTO knowledge_drafts (
      id, project_id, status, input_text, facts_json, field_reviews_json,
      profile_json, source_quotes_json, warnings_json, created_at, updated_at
    )
    VALUES (
      @id, @project_id, 'pending', @input_text, @facts_json, @field_reviews_json,
      @profile_json, @source_quotes_json, @warnings_json, @created_at, @updated_at
    )
  `).run({
    id: draftId,
    project_id: projectExists(payload.project_id) ? payload.project_id : null,
    input_text: inputText,
    facts_json: jsonString(facts),
    field_reviews_json: jsonString(fieldReviews),
    profile_json: jsonString(profile),
    source_quotes_json: jsonString(sourceQuotes),
    warnings_json: jsonString(warnings),
    created_at: timestamp,
    updated_at: timestamp,
  });

  return {
    id: draftId,
    intent: payload.intent || 'create',
    project_id: projectExists(payload.project_id) ? payload.project_id : null,
    conversation_id: payload.conversation_id || null,
    assistant_message_id: null,
    status: 'pending',
    profile,
    facts,
    field_reviews: fieldReviews,
    missing_fields: missingFields,
    confidence: {
      mode: extraction.extraction_provider === 'local' ? 'local-fact-extraction' : 'llm-fact-extraction',
      fact_count: facts.length,
      average: facts.length
        ? Number((facts.reduce((sum, fact) => sum + (fact.confidence || 0), 0) / facts.length).toFixed(2))
        : 0,
      provider: extraction.extraction_provider || null,
    },
    source_summary: sourceSummary,
    source_quotes: sourceQuotes,
    warnings,
    extraction_status: extraction.extraction_status || (facts.length ? 'completed' : 'needs_review'),
    extraction_model: extraction.extraction_model || 'unknown',
    assets,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function getDraft(draftId) {
  const row = getDb().prepare('SELECT * FROM knowledge_drafts WHERE id = ?').get(draftId);
  if (!row) throw new Error('知识库草稿不存在。');
  return row;
}

function confirmKnowledgeDraft(payload = {}) {
  const draftId = payload.draftId || payload.id;
  if (!draftId) throw new Error('draftId is required.');

  const draft = getDraft(draftId);
  const draftProfile = normalizeProfile(parseJson(draft.profile_json, {}));
  const profile = normalizeProfile({ ...draftProfile, ...(payload.profile || {}) });
  const response = saveProfile({ ...profile, project_id: projectExists(draft.project_id) ? draft.project_id : profile.project_id });
  const projectId = response.profile.project_id || response.profile.id;

  getDb().prepare(`
    UPDATE knowledge_drafts
    SET status = 'confirmed',
        project_id = @project_id,
        updated_at = @updated_at
    WHERE id = @id
  `).run({ id: draftId, project_id: projectId, updated_at: nowIso() });

  return {
    ok: true,
    project_id: projectId,
    profile: response.profile,
    entries: response.entries,
    total: response.total,
    index_status: response.index_status,
  };
}

function rejectKnowledgeDraft(draftId) {
  if (!draftId) throw new Error('draftId is required.');
  const result = getDb().prepare(`
    UPDATE knowledge_drafts
    SET status = 'rejected',
        updated_at = ?
    WHERE id = ?
  `).run(nowIso(), draftId);
  return { ok: result.changes > 0 };
}

async function createKnowledgeAsset(asset = {}) {
  const projectId = normalizeText(asset.project_id);
  if (!projectId) throw new Error('project_id is required.');
  projectService.getProject(projectId);

  const [parsed] = await parseAssets([asset]);
  if (!parsed || parsed.asset.status === 'failed') {
    return {
      asset: {
        ...(parsed?.asset || {}),
        id: crypto.randomUUID(),
        project_id: projectId,
        source_type: ASSET_ENTRY_TYPE,
      },
      ...listEntries(projectId),
    };
  }

  const db = getDb();
  db.transaction(() => {
    insertEntryWithChunks(db, {
      projectId,
      type: ASSET_ENTRY_TYPE,
      title: parsed.asset.filename,
      content: parsed.document.text,
      metadata: { source: 'upload', filename: parsed.asset.filename, content_type: parsed.asset.content_type },
    });
  })();

  return {
    asset: {
      ...parsed.asset,
      id: crypto.randomUUID(),
      project_id: projectId,
      source_type: ASSET_ENTRY_TYPE,
    },
    ...listEntries(projectId),
  };
}

function makeFtsQuery(query) {
  return normalizeText(query)
    .split(/\s+/)
    .map((token) => token.replace(/"/g, ''))
    .filter(Boolean)
    .map((token) => `"${token}"`)
    .join(' OR ');
}

function searchKnowledge(payload = {}) {
  const projectId = normalizeText(payload.projectId || payload.project_id);
  const query = normalizeText(payload.query);
  const limit = Number(payload.limit || 10);
  if (!projectId || !query) return { entries: [], total: 0 };

  projectService.getProject(projectId);
  const db = getDb();
  const ftsQuery = makeFtsQuery(query);
  let rows = [];
  if (ftsQuery) {
    rows = db.prepare(`
      SELECT kc.id, kc.project_id, kc.entry_id, 'chunk' AS type, kc.title, kc.content,
             kc.metadata_json, 0 AS chunk_index, 'indexed' AS embedding_status,
             NULL AS error_message, kc.created_at, kc.created_at AS updated_at
      FROM knowledge_chunks_fts fts
      JOIN knowledge_chunks kc ON kc.id = fts.id
      WHERE fts.project_id = ? AND knowledge_chunks_fts MATCH ?
      LIMIT ?
    `).all(projectId, ftsQuery, limit);
  }

  if (!rows.length) {
    rows = db.prepare(`
      SELECT kc.id, kc.project_id, kc.entry_id, 'chunk' AS type, kc.title, kc.content,
             kc.metadata_json, 0 AS chunk_index, 'indexed' AS embedding_status,
             NULL AS error_message, kc.created_at, kc.created_at AS updated_at
      FROM knowledge_chunks kc
      WHERE kc.project_id = @projectId
        AND (kc.content LIKE @likeQuery OR kc.title LIKE @likeQuery)
      ORDER BY datetime(kc.created_at) DESC
      LIMIT @limit
    `).all({ projectId, likeQuery: `%${query}%`, limit });
  }
  return { entries: rows.map(rowToEntry), total: rows.length };
}

function reindexKnowledge(projectId) {
  if (!projectId) throw new Error('projectId is required.');
  projectService.getProject(projectId);
  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM knowledge_chunks_fts WHERE project_id = ?').run(projectId);
    const rows = db.prepare('SELECT id, project_id, title, content FROM knowledge_chunks WHERE project_id = ?').all(projectId);
    const insertFts = db.prepare('INSERT INTO knowledge_chunks_fts (id, project_id, title, content) VALUES (?, ?, ?, ?)');
    rows.forEach((row) => insertFts.run(row.id, row.project_id, row.title || '', row.content));
  })();
  return getIndexStatus(projectId);
}

function hasMeaningfulDraftProfile(profile = {}) {
  return [
    profile.company_name,
    profile.main_business,
    profile.products_services,
    profile.core_advantages,
    profile.trust_endorsements,
    profile.cases,
    profile.target_keywords,
  ].some((value) => {
    const textValue = normalizeText(value);
    return textValue && textValue !== UNKNOWN_COMPANY_NAME;
  });
}

function normalizeDraftError(error, prefix = '知识库草稿创建失败') {
  const message = error instanceof Error ? error.message : String(error || '未知错误');
  if (/API Key|401|Unauthorized/i.test(message)) return `${prefix}：API Key 无效或未配置。`;
  if (/429|rate limit|quota/i.test(message)) return `${prefix}：接口限流或额度不足，请稍后重试。`;
  if (/400|BadRequest|InvalidParameter/i.test(message)) return `${prefix}：请求参数或模型配置不兼容。${message}`;
  return `${prefix}：${message}`;
}

function createFailedDraftResponse({ draftId, payload, assets, documents, messageText, errorMessage, timestamp, extraction = {} }) {
  const sourceSummary = {
    text_length: normalizeText(messageText).length,
    asset_count: assets.length,
    parsed_asset_count: assets.filter((asset) => asset.status === 'parsed').length,
    failed_asset_count: assets.filter((asset) => asset.status === 'failed').length,
    fact_count: 0,
    quote_count: 0,
  };
  const warnings = [
    errorMessage,
    ...assets.filter((asset) => asset.status === 'failed').map((asset) => `${asset.filename}: ${asset.error_message}`),
  ].filter(Boolean);

  return {
    id: draftId,
    intent: payload.intent || 'create',
    project_id: projectExists(payload.project_id) ? payload.project_id : null,
    conversation_id: payload.conversation_id || null,
    assistant_message_id: null,
    status: 'failed',
    profile: normalizeProfile({ project_id: payload.project_id || null }),
    facts: [],
    field_reviews: [],
    missing_fields: REQUIRED_FIELDS.map(([, label]) => label),
    confidence: {
      mode: 'failed',
      fact_count: 0,
      average: 0,
      provider: extraction.extraction_provider || null,
    },
    source_summary: sourceSummary,
    source_quotes: [],
    warnings,
    error_message: errorMessage,
    extraction_status: 'failed',
    extraction_model: extraction.extraction_model || 'not-run',
    assets,
    documents,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

async function createKnowledgeDraftStrict(payload = {}, onEvent = null) {
  const db = getDb();
  const draftId = crypto.randomUUID();
  const timestamp = nowIso();

  onEvent?.({ type: 'status', step_index: 0, message: '正在解析上传资料...', can_proceed: false });
  const parsedAssets = await parseAssets(payload.assets || []);
  const assets = parsedAssets.map(({ asset }) => ({ ...asset, draft_id: draftId }));
  const documents = parsedAssets.map(({ document }) => document);
  const parsedDocuments = documents.filter((document) => document.status === 'parsed' && normalizeText(document.text));
  const messageText = normalizeText(payload.message);
  const documentText = parsedDocuments.map((document) => `# ${document.filename}\n${document.text}`).join('\n\n');
  const inputText = [messageText, documentText].filter(Boolean).join('\n\n');
  const hasAttachment = assets.length > 0;
  const hasUsefulPastedText = messageText.length >= 40 && !/^已上传\s*\d+\s*个附件/.test(messageText);

  if ((hasAttachment && !parsedDocuments.length && !hasUsefulPastedText) || !normalizeText(inputText)) {
    const errorMessage = assets.some((asset) => asset.status === 'failed')
      ? `资料解析失败：${assets.filter((asset) => asset.status === 'failed').map((asset) => `${asset.filename}: ${asset.error_message}`).join('；')}`
      : '未解析到可用于建库的企业资料。请上传 DOCX/TXT/Markdown，或粘贴完整企业资料。';
    const failedDraft = createFailedDraftResponse({ draftId, payload, assets, documents, messageText, errorMessage, timestamp });
    onEvent?.({ type: 'error', error: errorMessage, draft: failedDraft, can_proceed: false });
    return failedDraft;
  }

  console.info('[knowledge-draft] parsed assets', {
    draftId,
    asset_count: assets.length,
    parsed_asset_count: parsedDocuments.length,
    text_length: inputText.length,
    failed_assets: assets.filter((asset) => asset.status === 'failed').map((asset) => ({
      filename: asset.filename,
      error_message: asset.error_message,
    })),
  });

  onEvent?.({ type: 'status', step_index: 1, message: '正在调用知识库抽取模型...', can_proceed: false });
  let extraction;
  try {
    extraction = payload.debug_local_fallback === true
      ? buildLocalExtraction(parsedDocuments, messageText, payload.project_id || null)
      : await extractKnowledgeDraftStream({
          documents: parsedDocuments,
          message: messageText,
          projectId: payload.project_id || null,
          onEvent,
        });
  } catch (error) {
    const errorMessage = normalizeDraftError(error, '知识库抽取模型调用失败');
    const failedDraft = createFailedDraftResponse({ draftId, payload, assets, documents, messageText, errorMessage, timestamp });
    onEvent?.({ type: 'error', error: errorMessage, draft: failedDraft, can_proceed: false });
    return failedDraft;
  }

  const facts = extraction.facts || [];
  const profile = normalizeProfile({
    ...(extraction.profile || {}),
    project_id: projectExists(payload.project_id) ? payload.project_id : extraction.profile?.project_id || null,
  });
  const extractionFailed = extraction.extraction_status === 'failed' || (!facts.length && !hasMeaningfulDraftProfile(profile));
  if (extractionFailed) {
    const errorMessage = facts.length
      ? '模型返回结果缺少有效企业字段，请补充更完整的企业资料后重试。'
      : '模型未抽取到可追溯的企业事实，请补充更完整的企业资料后重试。';
    const failedDraft = createFailedDraftResponse({ draftId, payload, assets, documents, messageText, errorMessage, timestamp, extraction });
    onEvent?.({ type: 'error', error: errorMessage, draft: failedDraft, can_proceed: false });
    return failedDraft;
  }

  const missingFields = extraction.missing_fields || missingFieldsForProfile(profile);
  const fieldReviews = extraction.field_reviews || buildFieldReviews(profile, facts);
  const sourceQuotes = extraction.source_quotes || buildSourceQuotes(parsedDocuments, facts);
  const warnings = [
    ...(extraction.warnings || []),
    ...assets.filter((asset) => asset.status === 'failed').map((asset) => `${asset.filename}: ${asset.error_message}`),
    ...(missingFields.length ? [`仍需补充字段：${missingFields.join('、')}`] : []),
  ];
  const sourceSummary = {
    text_length: inputText.length,
    asset_count: assets.length,
    parsed_asset_count: assets.filter((asset) => asset.status === 'parsed').length,
    failed_asset_count: assets.filter((asset) => asset.status === 'failed').length,
    fact_count: facts.length,
    quote_count: sourceQuotes.length,
  };

  onEvent?.({
    type: 'status',
    step_index: 2,
    message: `已抽取 ${facts.length} 条可追溯事实，正在生成字段核对草稿...`,
    can_proceed: false,
  });

  db.prepare(`
    INSERT INTO knowledge_drafts (
      id, project_id, status, input_text, facts_json, field_reviews_json,
      profile_json, source_quotes_json, warnings_json, created_at, updated_at
    )
    VALUES (
      @id, @project_id, 'pending', @input_text, @facts_json, @field_reviews_json,
      @profile_json, @source_quotes_json, @warnings_json, @created_at, @updated_at
    )
  `).run({
    id: draftId,
    project_id: projectExists(payload.project_id) ? payload.project_id : null,
    input_text: inputText,
    facts_json: jsonString(facts),
    field_reviews_json: jsonString(fieldReviews),
    profile_json: jsonString(profile),
    source_quotes_json: jsonString(sourceQuotes),
    warnings_json: jsonString(warnings),
    created_at: timestamp,
    updated_at: timestamp,
  });

  const draft = {
    id: draftId,
    intent: payload.intent || 'create',
    project_id: projectExists(payload.project_id) ? payload.project_id : null,
    conversation_id: payload.conversation_id || null,
    assistant_message_id: null,
    status: 'pending',
    profile,
    facts,
    field_reviews: fieldReviews,
    missing_fields: missingFields,
    confidence: {
      mode: extraction.extraction_provider === 'local' ? 'local-fact-extraction' : 'llm-fact-extraction',
      fact_count: facts.length,
      average: facts.length
        ? Number((facts.reduce((sum, fact) => sum + (fact.confidence || 0), 0) / facts.length).toFixed(2))
        : 0,
      provider: extraction.extraction_provider || null,
    },
    source_summary: sourceSummary,
    source_quotes: sourceQuotes,
    warnings,
    error_message: null,
    extraction_status: extraction.extraction_status || (facts.length ? 'completed' : 'needs_review'),
    extraction_model: extraction.extraction_model || 'unknown',
    assets,
    created_at: timestamp,
    updated_at: timestamp,
  };

  onEvent?.({
    type: 'draft_section',
    section: 'facts',
    message: `已整理 ${facts.length} 条事实候选`,
    items: facts,
    can_proceed: false,
  });
  onEvent?.({
    type: 'draft_section',
    section: 'field_reviews',
    message: `已生成 ${fieldReviews.length} 个字段核对项`,
    items: fieldReviews,
    can_proceed: false,
  });
  onEvent?.({
    type: 'draft_section',
    section: 'source_quotes',
    message: `已关联 ${sourceQuotes.length} 条来源片段`,
    items: sourceQuotes,
    can_proceed: false,
  });
  onEvent?.({ type: 'result', draft, can_proceed: true });
  onEvent?.({ type: 'done', draft, can_proceed: true });
  return draft;
}

module.exports = {
  confirmKnowledgeDraft,
  createKnowledgeAsset,
  createKnowledgeDraft: createKnowledgeDraftStrict,
  createKnowledgeEntry,
  getKnowledgeEntries: listEntries,
  getKnowledgeIndexStatus: getIndexStatus,
  getKnowledgeProfile,
  reindexKnowledge,
  rejectKnowledgeDraft,
  saveEnterpriseProfile,
  searchKnowledge,
  updateKnowledgeProfile,
};
