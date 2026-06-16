const crypto = require('node:crypto');
const { getDb } = require('./databaseService.cjs');
const { fieldText, toEvidenceField } = require('./profileFieldService.cjs');

function nowIso() {
  return new Date().toISOString();
}

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeProjectPayload(payload = {}) {
  const name = String(payload.name || payload.company_name || payload.companyName || '').trim();
  if (!name) {
    throw new Error('企业名称不能为空。');
  }

  return {
    name,
    description: payload.description ? String(payload.description).trim() : null,
  };
}

function projectRowToSummary(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function createProject(payload = {}) {
  const db = getDb();
  const data = normalizeProjectPayload(payload);
  const timestamp = nowIso();
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO projects (id, name, description, status, created_at, updated_at)
    VALUES (@id, @name, @description, 'active', @created_at, @updated_at)
  `).run({
    id,
    name: data.name,
    description: data.description,
    created_at: timestamp,
    updated_at: timestamp,
  });

  return { project: getProject(id).project };
}

function listProjects() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, description, status, created_at, updated_at
    FROM projects
    ORDER BY updated_at DESC, created_at DESC
  `).all();

  return rows.map(projectRowToSummary);
}

function getProject(projectId) {
  if (!projectId) {
    throw new Error('projectId is required.');
  }

  const db = getDb();
  const row = db.prepare(`
    SELECT id, name, description, status, created_at, updated_at
    FROM projects
    WHERE id = ?
  `).get(projectId);

  if (!row) {
    throw new Error('企业项目不存在。');
  }

  return { project: projectRowToSummary(row) };
}

function deleteProject(projectId) {
  if (!projectId) {
    throw new Error('projectId is required.');
  }

  const db = getDb();
  const deleteTx = db.transaction((id) => {
    db.prepare('DELETE FROM knowledge_chunks_fts WHERE project_id = ?').run(id);
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return result.changes;
  });

  return { ok: deleteTx(projectId) > 0 };
}

function countKnowledgeEntries(db, projectId) {
  return db.prepare('SELECT COUNT(*) AS count FROM knowledge_entries WHERE project_id = ?')
    .get(projectId).count;
}

function buildCompatibleProfile(row) {
  const profile = parseJson(row.profile_json, {});
  const companyName = fieldText(profile, 'company_name') || row.name;

  return {
    id: row.profile_id || row.project_id,
    project_id: row.project_id,
    ...profile,
    company_name: profile.company_name || toEvidenceField(companyName),
    short_name: profile.short_name || toEvidenceField(companyName),
    detailed_intro: profile.detailed_intro || toEvidenceField(row.description || null),
    official_website: profile.official_website || null,
    official_media: profile.official_media || null,
    generated_long_tail_keywords: profile.generated_long_tail_keywords || null,
    entry_count: row.entry_count || 0,
    created_at: row.profile_created_at || row.created_at,
    updated_at: row.profile_updated_at || row.updated_at,
  };
}

function listKnowledgeProfiles() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      p.id AS project_id,
      p.name,
      p.description,
      p.created_at,
      p.updated_at,
      ep.project_id AS profile_id,
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
    WHERE p.status = 'active'
      AND (ep.project_id IS NOT NULL OR COALESCE(entry_counts.entry_count, 0) > 0)
    ORDER BY p.updated_at DESC, p.created_at DESC
  `).all();

  return rows.map(buildCompatibleProfile);
}

function getKnowledgeProfile(projectId, indexStatus = null) {
  getProject(projectId);

  const db = getDb();
  const row = db.prepare(`
    SELECT
      p.id AS project_id,
      p.name,
      p.description,
      p.created_at,
      p.updated_at,
      ep.project_id AS profile_id,
      ep.profile_json,
      ep.created_at AS profile_created_at,
      ep.updated_at AS profile_updated_at,
      ? AS entry_count
    FROM projects p
    LEFT JOIN enterprise_profiles ep ON ep.project_id = p.id
    WHERE p.id = ?
  `).get(countKnowledgeEntries(db, projectId), projectId);

  return {
    profile: buildCompatibleProfile(row),
    entries: [],
    total: 0,
    index_status: indexStatus,
  };
}

const STAGE_LABELS = {
  1: '企业知识库',
  2: 'AI 问题池',
  3: '信源发现',
  4: '内容资产生成',
  5: '稿件管理与发布',
  6: 'AI 推荐可见性检测',
  7: '反思优化/自动学习',
};

function buildStageStatus(stage, status, extra = {}) {
  return {
    stage,
    key: `stage_${stage}`,
    label: STAGE_LABELS[stage],
    status,
    ...extra,
  };
}

function computePlatformStages(db, projectId, platform, knowledgeReady) {
  let questionSet = null;
  let discovery = null;
  let articleStats = { total: 0, published: 0, reviewed: 0 };
  let visibilityCheck = null;
  let pendingRules = 0;

  try {
    questionSet = db.prepare(`
      SELECT id, status FROM geo_question_sets
      WHERE project_id = ? AND platform = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(projectId, platform);

    discovery = db.prepare(`
      SELECT id, status FROM geo_source_discoveries
      WHERE project_id = ? AND platform = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(projectId, platform);

    const articleRows = db.prepare(`
      SELECT status, draft_json FROM geo_article_drafts
      WHERE project_id = ? AND platform = ?
    `).all(projectId, platform);

    articleStats = articleRows.reduce((acc, row) => {
      acc.total += 1;
      const parsed = parseJson(row.draft_json, {});
      const status = parsed?.publication_evidence?.status || row.status;
      if (status === 'published') acc.published += 1;
      if (['reviewed', 'published'].includes(status)) acc.reviewed += 1;
      return acc;
    }, { total: 0, published: 0, reviewed: 0 });

    visibilityCheck = db.prepare(`
      SELECT id, status FROM ai_visibility_checks
      WHERE project_id = ? AND platform = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(projectId, platform);

    pendingRules = db.prepare(`
      SELECT COUNT(*) AS count FROM evolution_rules
      WHERE project_id = ? AND platform = ? AND status = 'pending'
    `).get(projectId, platform)?.count || 0;
  } catch {
    // 保持空状态可用
  }

  const stage2Status = questionSet ? 'completed' : (knowledgeReady ? 'ready' : 'not_started');
  const stage3Status = discovery ? 'completed' : (questionSet ? 'ready' : 'not_started');
  const stage4Status = articleStats.total >= 9 ? 'completed' : (discovery ? 'ready' : 'not_started');
  const stage5Status = articleStats.published > 0 ? 'completed' : (articleStats.total > 0 ? 'ready' : 'not_started');
  const stage6Status = visibilityCheck ? 'completed' : (articleStats.published > 0 ? 'ready' : 'not_started');
  const stage7Status = pendingRules > 0 ? 'pending' : (visibilityCheck ? 'ready' : 'not_started');

  return {
    stage_2: buildStageStatus(2, stage2Status, questionSet ? { artifact_id: questionSet.id } : {}),
    stage_3: buildStageStatus(3, stage3Status, discovery ? { artifact_id: discovery.id } : {}),
    stage_4: buildStageStatus(4, stage4Status, { total: articleStats.total, published: articleStats.published }),
    stage_5: buildStageStatus(5, stage5Status, { total: articleStats.total, published: articleStats.published }),
    stage_6: buildStageStatus(6, stage6Status, visibilityCheck ? { artifact_id: visibilityCheck.id } : {}),
    stage_7: buildStageStatus(7, stage7Status, { pending_rules: pendingRules }),
  };
}

function computeOverallProgress(stage1Status, platforms) {
  const platformList = Object.values(platforms || {});
  if (platformList.length === 0) {
    return stage1Status === 'completed' ? 14 : 0;
  }

  const platformProgress = platformList.map((platformStages) => {
    const stages = Object.values(platformStages);
    const completed = stages.filter((s) => s.status === 'completed').length;
    return completed / stages.length;
  });

  const platformAverage = platformProgress.reduce((a, b) => a + b, 0) / platformProgress.length;
  const stage1Weight = stage1Status === 'completed' ? 1 : 0;

  return Math.round(((stage1Weight + platformAverage * 6) / 7) * 100);
}

function buildProjectProgress(projectRow) {
  const db = getDb();
  const profile = parseJson(projectRow.profile_json, {});
  const entryCount = projectRow.entry_count || 0;
  const companyName = fieldText(profile, 'company_name') || projectRow.name;
  const knowledgeReady = Boolean(companyName !== '待录入企业' && entryCount > 0);
  const stage1Status = knowledgeReady ? 'completed' : (entryCount > 0 || projectRow.profile_json ? 'ready' : 'not_started');

  const platforms = {
    doubao: computePlatformStages(db, projectRow.project_id, 'doubao', knowledgeReady),
    deepseek: computePlatformStages(db, projectRow.project_id, 'deepseek', knowledgeReady),
  };

  return {
    id: projectRow.project_id,
    name: projectRow.name,
    description: projectRow.description || null,
    company_name: companyName,
    industry_category: fieldText(profile, 'industry_category') || null,
    reflection_enabled: projectRow.reflection_enabled !== 0,
    stage_1: buildStageStatus(1, stage1Status),
    platforms,
    overall_progress: computeOverallProgress(stage1Status, platforms),
    created_at: projectRow.created_at,
    updated_at: projectRow.updated_at,
  };
}

function listProjectsWithStageProgress() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      p.id AS project_id,
      p.name,
      p.description,
      p.status,
      p.reflection_enabled,
      p.created_at,
      p.updated_at,
      ep.profile_json,
      COALESCE(entry_counts.entry_count, 0) AS entry_count
    FROM projects p
    LEFT JOIN enterprise_profiles ep ON ep.project_id = p.id
    LEFT JOIN (
      SELECT project_id, COUNT(*) AS entry_count
      FROM knowledge_entries
      GROUP BY project_id
    ) entry_counts ON entry_counts.project_id = p.id
    WHERE p.status = 'active'
      AND (ep.project_id IS NOT NULL OR COALESCE(entry_counts.entry_count, 0) > 0)
    ORDER BY p.updated_at DESC, p.created_at DESC
  `).all();

  return rows.map(buildProjectProgress);
}

function getProjectSummary(projectId) {
  if (!projectId) {
    throw new Error('projectId is required.');
  }

  const db = getDb();
  const row = db.prepare(`
    SELECT
      p.id AS project_id,
      p.name,
      p.description,
      p.status,
      p.reflection_enabled,
      p.created_at,
      p.updated_at,
      ep.profile_json,
      COALESCE(entry_counts.entry_count, 0) AS entry_count
    FROM projects p
    LEFT JOIN enterprise_profiles ep ON ep.project_id = p.id
    LEFT JOIN (
      SELECT project_id, COUNT(*) AS entry_count
      FROM knowledge_entries
      WHERE project_id = ?
      GROUP BY project_id
    ) entry_counts ON entry_counts.project_id = p.id
    WHERE p.id = ?
  `).get(projectId, projectId);

  if (!row) {
    throw new Error('企业项目不存在。');
  }

  return { project: buildProjectProgress(row) };
}

function setReflectionEnabled(projectId, enabled) {
  if (!projectId) {
    throw new Error('projectId is required.');
  }

  const db = getDb();
  const result = db.prepare(`
    UPDATE projects
    SET reflection_enabled = ?, updated_at = ?
    WHERE id = ?
  `).run(enabled ? 1 : 0, nowIso(), projectId);

  if (result.changes === 0) {
    throw new Error('企业项目不存在。');
  }

  return {
    ok: true,
    project_id: projectId,
    reflection_enabled: enabled,
  };
}

module.exports = {
  createProject,
  deleteProject,
  getKnowledgeProfile,
  getProject,
  getProjectSummary,
  listKnowledgeProfiles,
  listProjects,
  listProjectsWithStageProgress,
  setReflectionEnabled,
};
