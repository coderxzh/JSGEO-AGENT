const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const {
  closeDatabase,
  getDbPath,
  initializeDatabase,
} = require('./services/databaseService.cjs');
const knowledgeService = require('./services/knowledgeService.cjs');
const projectService = require('./services/projectService.cjs');
const sourceDiscoveryService = require('./services/sourceDiscoveryService.cjs');

const rootDir = path.resolve(__dirname, '..', '..');
const isDev = !app.isPackaged;

let mainWindow = null;

function nowIso() {
  return new Date().toISOString();
}

function loadEnvFile() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      const separator = trimmed.indexOf('=');
      if (separator <= 0) {
        return;
      }

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      if (!key || process.env[key] !== undefined) {
        return;
      }

      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    });
}

function emptyIndexStatus(projectId = null) {
  return {
    project_id: projectId,
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

function getKnowledgeSnapshot(projectId) {
  if (!projectId) {
    return { profile: null, index_status: emptyIndexStatus(null) };
  }

  try {
    return knowledgeService.getKnowledgeProfile(projectId);
  } catch {
    return { profile: null, index_status: emptyIndexStatus(projectId) };
  }
}

function keywordListFromProfile(profile) {
  if (!profile?.target_keywords) {
    return [];
  }

  return String(profile.target_keywords)
    .split(/[,\n，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function createShellGeoProject(projectId) {
  const timestamp = nowIso();
  const snapshot = getKnowledgeSnapshot(projectId);
  const profile = snapshot.profile;
  const indexStatus = snapshot.index_status || emptyIndexStatus(projectId);
  const companyName = profile?.company_name || '待录入企业';
  const knowledgeReady = Boolean(profile?.company_name && indexStatus.indexed > 0);

  return {
    id: `geo-${projectId || 'shell'}`,
    project_id: projectId || '',
    company_name: companyName,
    industry: profile?.industry || null,
    region: null,
    current_phase: knowledgeReady ? 'ready_for_check' : 'collecting',
    platforms: ['doubao', 'deepseek'],
    knowledge_base_ready: knowledgeReady,
    initial_keywords: keywordListFromProfile(profile),
    phase_status: {
      stage_1: { status: knowledgeReady ? 'completed' : 'not_started', label: '企业知识库' },
      platforms: {
        doubao: { stage_2: { status: knowledgeReady ? 'ready' : 'not_started', label: 'AI 问题池' } },
        deepseek: { stage_2: { status: knowledgeReady ? 'ready' : 'not_started', label: 'AI 问题池' } },
      },
    },
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function createShellWorkflowState(geoProjectId) {
  const projectId = String(geoProjectId || '').replace(/^geo-/, '');
  const snapshot = getKnowledgeSnapshot(projectId);
  const profile = snapshot.profile;
  const indexStatus = snapshot.index_status || emptyIndexStatus(projectId);
  const knowledgeReady = Boolean(profile?.company_name && indexStatus.indexed > 0);

  const stage = (stageNumber, key, label, description, status = 'not_started') => ({
    stage: stageNumber,
    key,
    label,
    status,
    description,
    artifact_id: null,
    artifacts: {},
  });

  const platformState = (platform, label) => ({
    platform,
    label,
    stages: {
      stage_2: stage(
        2,
        'stage_2',
        'AI 问题池',
        '基于企业知识库生成真实 AI 用户会问的推荐、对比和采购问题。',
        knowledgeReady ? 'ready' : 'not_started'
      ),
      stage_3: stage(3, 'stage_3', '支撑内容策略', '规划被 AI 引用和推荐所需的内容证据。'),
      stage_4: stage(4, 'stage_4', '支撑内容生成', '生成咨询类、测评类和推荐理由类内容草稿。'),
    },
  });

  return {
    geo_project_id: geoProjectId,
    enterprise_project_id: projectId,
    company_name: profile?.company_name || '待录入企业',
    current_phase: knowledgeReady ? 'ready_for_check' : 'collecting',
    knowledge_base_ready: knowledgeReady,
    stage_1: stage(
      1,
      'stage_1',
      '企业知识库',
      '上传或粘贴企业资料，确认后建立本地知识库。',
      knowledgeReady ? 'completed' : 'ready'
    ),
    platforms: {
      doubao: platformState('doubao', '豆包'),
      deepseek: platformState('deepseek', 'DeepSeek'),
    },
  };
}

function notImplemented(name) {
  return new Error(`${name} 尚未接入新的 Electron-only 服务层，将在后续阶段实现。`);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#f7f7f5',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:3000');
  } else {
    await mainWindow.loadFile(path.join(rootDir, 'dist', 'index.html'));
  }
}

function getConfigStatus() {
  return {
    providers: {
      openai: {
        provider: 'openai',
        configured: Boolean(process.env.OPENAI_API_KEY),
        model: process.env.OPENAI_MODEL || 'not-configured',
        base_url: process.env.OPENAI_BASE_URL || '',
      },
      deepseek: {
        provider: 'deepseek',
        configured: Boolean(process.env.DEEPSEEK_API_KEY),
        model: process.env.DEEPSEEK_MODEL || 'not-configured',
        base_url: process.env.DEEPSEEK_BASE_URL || '',
      },
      ark: {
        provider: 'volcengine-ark',
        configured: Boolean(process.env.ARK_API_KEY),
        model: process.env.ARK_MODEL || process.env.ARK_EMBEDDING_MODEL || 'not-configured',
        base_url: process.env.ARK_BASE_URL || process.env.ARK_EMBEDDING_BASE_URL || '',
      },
    },
  };
}

function registerHandlers() {
  const health = async () => ({
    ok: true,
    service: 'geo-agent-electron-main',
    mode: 'electron-only-local',
    database_path: getDbPath(),
    timestamp: nowIso(),
  });

  ipcMain.handle('app:ping', health);
  ipcMain.handle('geo-agent:health-check', health);
  ipcMain.handle('geo-agent:get-config-status', async () => getConfigStatus());

  ipcMain.handle('geo-agent:get-skills', async () => ({
    skills: [
      {
        id: 'knowledge-base-ingest',
        name: '企业知识库创建',
        description: '上传或粘贴企业资料，创建本地企业知识库。',
        visibility: 'user',
        path: 'builtin://knowledge-base-ingest',
        content: '阶段 2A 内置技能。当前先提供本地草稿与索引闭环，后续接入 LLM 事实抽取。',
      },
    ],
  }));

  ipcMain.handle('geo-agent:get-projects', async () => ({
    projects: projectService.listProjects(),
  }));
  ipcMain.handle('geo-agent:create-project', async (_event, payload) => projectService.createProject(payload));
  ipcMain.handle('geo-agent:get-project', async (_event, projectId) => projectService.getProject(projectId));
  ipcMain.handle('geo-agent:delete-project', async (_event, projectId) => projectService.deleteProject(projectId));

  ipcMain.handle('geo-agent:get-knowledge-profiles', async () => ({
    profiles: projectService.listKnowledgeProfiles(),
  }));
  ipcMain.handle('geo-agent:get-knowledge-profile', async (_event, projectId) =>
    knowledgeService.getKnowledgeProfile(projectId));
  ipcMain.handle('geo-agent:delete-knowledge-profile', async (_event, projectId) =>
    projectService.deleteProject(projectId));
  ipcMain.handle('geo-agent:get-knowledge-entries', async (_event, payload = {}) =>
    knowledgeService.getKnowledgeEntries(payload.projectId || payload.project_id, payload.limit));
  ipcMain.handle('geo-agent:search-knowledge', async (_event, payload = {}) =>
    knowledgeService.searchKnowledge(payload));
  ipcMain.handle('geo-agent:get-knowledge-index-status', async (_event, projectId = null) =>
    knowledgeService.getKnowledgeIndexStatus(projectId));
  ipcMain.handle('geo-agent:reindex-knowledge', async (_event, projectId) =>
    knowledgeService.reindexKnowledge(projectId));
  ipcMain.handle('geo-agent:save-enterprise-profile', async (_event, profile) =>
    knowledgeService.saveEnterpriseProfile(profile));
  ipcMain.handle('geo-agent:update-knowledge-profile', async (_event, payload = {}) =>
    knowledgeService.updateKnowledgeProfile(payload.projectId, payload.profile));
  ipcMain.handle('geo-agent:create-knowledge-entry', async (_event, entry) =>
    knowledgeService.createKnowledgeEntry(entry));
  ipcMain.handle('geo-agent:create-knowledge-asset', async (_event, asset) =>
    knowledgeService.createKnowledgeAsset(asset));
  ipcMain.handle('geo-agent:create-knowledge-draft', async (_event, draft) =>
    knowledgeService.createKnowledgeDraft(draft));
  ipcMain.handle('geo-agent:create-knowledge-draft-stream', async (event, request = {}) => {
    const requestId = request.requestId;
    const payload = request.payload || {};
    const channel = `geo-agent:create-knowledge-draft-stream:${requestId}`;
    try {
      event.sender.send(channel, { type: 'meta', task: 'knowledge_extraction', can_proceed: false });
      const draft = await knowledgeService.createKnowledgeDraft(payload, (streamEvent) => {
        event.sender.send(channel, streamEvent);
      });
      if (draft.extraction_status === 'failed' || draft.status === 'failed') {
        const error = draft.error_message || draft.warnings?.[0] || '知识库草稿创建失败。';
        event.sender.send(channel, { type: 'error', error, draft, can_proceed: false });
        return { type: 'error', error, draft, can_proceed: false };
      }
      event.sender.send(channel, { type: 'done', draft, can_proceed: true });
      return { type: 'done', draft, can_proceed: true };
    } catch (error) {
      const message = error.message || String(error);
      event.sender.send(channel, { type: 'error', error: message, can_proceed: false });
      return { type: 'error', error: message, can_proceed: false };
    }
  });
  ipcMain.handle('geo-agent:confirm-knowledge-draft', async (_event, payload = {}) =>
    knowledgeService.confirmKnowledgeDraft(payload));
  ipcMain.handle('geo-agent:reject-knowledge-draft', async (_event, draftId) =>
    knowledgeService.rejectKnowledgeDraft(draftId));

  ipcMain.handle('geo-agent:get-conversations', async () => ({ conversations: [] }));
  ipcMain.handle('geo-agent:get-geo-projects', async () => ({ projects: [] }));
  ipcMain.handle('geo-agent:ensure-geo-project', async (_event, projectId) => createShellGeoProject(projectId));
  ipcMain.handle('geo-agent:get-geo-project', async (_event, geoProjectId) => createShellGeoProject(geoProjectId));
  ipcMain.handle('geo-agent:get-geo-workflow-state', async (_event, geoProjectId) => createShellWorkflowState(geoProjectId));

  ipcMain.handle('geo-agent:send-chat', async (_event, payloadOrMessage, conversationId = null, selectedModel = null) => {
    const payload = typeof payloadOrMessage === 'object' && payloadOrMessage !== null
      ? payloadOrMessage
      : { message: payloadOrMessage, conversation_id: conversationId, selected_model: selectedModel };

    return {
      role: 'assistant',
      content: '新的 Electron-only 服务层正在重建中。阶段 1 已接入本地企业数据库，阶段 2A 已接入本地知识库保存、切片和 FTS 检索。聊天能力将在后续阶段接入。',
      conversation_id: payload.conversation_id || `shell-${Date.now()}`,
      provider: 'electron-main',
      model: payload.selected_model || 'not-connected',
      error: null,
      sources: [],
      search_queries: [],
      search_actions: [],
      search_usage: {},
      reasoning_content: null,
    };
  });

  ipcMain.handle('geo-agent:clear-conversation-history', async () => ({ ok: true, backup_path: '' }));
  ipcMain.handle('geo-agent:delete-conversation', async () => ({ ok: true }));
  ipcMain.handle('geo-agent:run-geo-source-discovery', async (_event, geoProjectId, platform, fallbackReport = null) =>
    sourceDiscoveryService.generateSourceDiscovery({ geoProjectId, platform, fallbackReport }));
  ipcMain.handle('geo-agent:run-geo-source-discovery-stream', async (event, request = {}) => {
    const requestId = request.requestId;
    const payload = request.payload || {};
    const channel = `geo-agent:run-geo-source-discovery-stream:${requestId}`;
    try {
      event.sender.send(channel, { type: 'meta', platform: payload.platform, phase: 3 });
      const discovery = await sourceDiscoveryService.generateSourceDiscoveryStream(payload, (streamEvent) => {
        event.sender.send(channel, streamEvent);
      });
      event.sender.send(channel, { type: 'done', status: discovery.status || 'completed' });
      return { type: 'done', status: discovery.status || 'completed' };
    } catch (error) {
      event.sender.send(channel, { type: 'error', error: error.message || String(error) });
      return { type: 'error', error: error.message || String(error) };
    }
  });
  ipcMain.handle('geo-agent:get-latest-geo-source-discovery', async (_event, geoProjectId, platform) =>
    sourceDiscoveryService.getLatestSourceDiscovery(geoProjectId, platform));
  ipcMain.handle('geo-agent:get-geo-source-discovery', async (_event, discoveryId) =>
    sourceDiscoveryService.getSourceDiscovery(discoveryId));
  ipcMain.handle('geo-agent:get-source-discoveries', async (_event, payload = {}) =>
    sourceDiscoveryService.listSourceDiscoveries(payload.projectId || payload.project_id, payload.platform || null));
  ipcMain.handle('geo-agent:confirm-source-discovery', async (_event, discoveryId) =>
    sourceDiscoveryService.confirmSourceDiscovery(discoveryId));

  const pendingApis = [
    'geo-agent:get-conversation',
    'geo-agent:send-chat-stream',
    'geo-agent:create-geo-phase-two-prompt',
    'geo-agent:confirm-geo-phase-two',
    'geo-agent:cancel-geo-phase-two',
    'geo-agent:run-geo-phase-two-report',
    'geo-agent:run-geo-phase-two-report-stream',
    'geo-agent:get-latest-geo-report',
    'geo-agent:get-geo-report',
    'geo-agent:get-latest-geo-question-set',
    'geo-agent:get-geo-question-set',
    'geo-agent:run-geo-article-draft',
    'geo-agent:run-geo-support-articles',
    'geo-agent:run-geo-support-articles-stream',
    'geo-agent:get-latest-geo-article-draft',
    'geo-agent:get-geo-article-draft',
    'geo-agent:confirm-geo-article-draft',
    'geo-agent:update-geo-article-draft',
  ];

  pendingApis.forEach((channel) => {
    ipcMain.handle(channel, async () => {
      throw notImplemented(channel);
    });
  });
}

loadEnvFile();
registerHandlers();

app.whenReady().then(async () => {
  initializeDatabase(app.getPath('userData'));
  await createWindow();
});

app.on('before-quit', () => {
  closeDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
