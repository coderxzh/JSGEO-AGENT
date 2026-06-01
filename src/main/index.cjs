const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const {
  closeDatabase,
  getDbPath,
  initializeDatabase,
} = require('./services/databaseService.cjs');
const projectService = require('./services/projectService.cjs');

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
    vector_backend: 'disabled',
    embedding_backend: process.env.ARK_API_KEY ? 'volcengine-ark' : 'disabled',
    pending: 0,
    indexed: 0,
    failed: 0,
    asset_count: 0,
    assets: [],
  };
}

function createShellGeoProject(projectId) {
  const timestamp = nowIso();
  return {
    id: `geo-${projectId || 'shell'}`,
    project_id: projectId || '',
    company_name: '待录入企业',
    industry: null,
    region: null,
    current_phase: 'collecting',
    platforms: ['doubao', 'deepseek'],
    knowledge_base_ready: false,
    initial_keywords: [],
    phase_status: {
      stage_1: { status: 'not_started', label: '企业知识库' },
      platforms: {
        doubao: { stage_2: { status: 'not_started', label: 'AI 问题池' } },
        deepseek: { stage_2: { status: 'not_started', label: 'AI 问题池' } },
      },
    },
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function createShellWorkflowState(geoProjectId) {
  const stage = (stageNumber, key, label, description) => ({
    stage: stageNumber,
    key,
    label,
    status: stageNumber === 1 ? 'ready' : 'not_started',
    description,
    artifact_id: null,
    artifacts: {},
  });

  const platformState = (platform, label) => ({
    platform,
    label,
    stages: {
      stage_2: stage(2, 'stage_2', 'AI 问题池', '基于企业知识库生成真实 AI 用户会问的推荐、对比和采购问题。'),
      stage_3: stage(3, 'stage_3', '支撑内容策略', '规划被 AI 引用和推荐所需的内容证据。'),
      stage_4: stage(4, 'stage_4', '支撑内容生成', '生成咨询类、测评类和推荐理由类内容草稿。'),
    },
  });

  return {
    geo_project_id: geoProjectId,
    enterprise_project_id: '',
    company_name: '待录入企业',
    current_phase: 'collecting',
    knowledge_base_ready: false,
    stage_1: stage(1, 'stage_1', '企业知识库', '上传或粘贴企业资料，确认后建立本地知识库。'),
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
        content: '阶段 1 占位技能。完整中文 Skill 规则将在知识库工作台阶段接入。',
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
    projectService.getKnowledgeProfile(projectId, emptyIndexStatus(projectId)));
  ipcMain.handle('geo-agent:delete-knowledge-profile', async (_event, projectId) =>
    projectService.deleteProject(projectId));

  ipcMain.handle('geo-agent:get-conversations', async () => ({ conversations: [] }));
  ipcMain.handle('geo-agent:get-knowledge-entries', async () => ({ entries: [], total: 0 }));
  ipcMain.handle('geo-agent:search-knowledge', async () => ({ entries: [], total: 0 }));
  ipcMain.handle('geo-agent:get-geo-projects', async () => ({ projects: [] }));

  ipcMain.handle('geo-agent:get-knowledge-index-status', async (_event, projectId = null) => emptyIndexStatus(projectId));
  ipcMain.handle('geo-agent:reindex-knowledge', async (_event, projectId) => emptyIndexStatus(projectId));

  ipcMain.handle('geo-agent:ensure-geo-project', async (_event, projectId) => createShellGeoProject(projectId));
  ipcMain.handle('geo-agent:get-geo-project', async (_event, geoProjectId) => createShellGeoProject(geoProjectId));
  ipcMain.handle('geo-agent:get-geo-workflow-state', async (_event, geoProjectId) => createShellWorkflowState(geoProjectId));

  ipcMain.handle('geo-agent:send-chat', async (_event, payloadOrMessage, conversationId = null, selectedModel = null) => {
    const payload = typeof payloadOrMessage === 'object' && payloadOrMessage !== null
      ? payloadOrMessage
      : { message: payloadOrMessage, conversation_id: conversationId, selected_model: selectedModel };

    return {
      role: 'assistant',
      content: '新的 Electron-only 服务层正在重建中。阶段 1 已接入本地企业数据库，聊天能力将在后续阶段接入。',
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
  ipcMain.handle('geo-agent:reject-knowledge-draft', async () => ({ ok: true }));

  const pendingApis = [
    'geo-agent:get-conversation',
    'geo-agent:send-chat-stream',
    'geo-agent:save-enterprise-profile',
    'geo-agent:update-knowledge-profile',
    'geo-agent:create-knowledge-entry',
    'geo-agent:create-knowledge-asset',
    'geo-agent:create-knowledge-draft',
    'geo-agent:confirm-knowledge-draft',
    'geo-agent:create-geo-phase-two-prompt',
    'geo-agent:confirm-geo-phase-two',
    'geo-agent:cancel-geo-phase-two',
    'geo-agent:run-geo-phase-two-report',
    'geo-agent:run-geo-phase-two-report-stream',
    'geo-agent:get-latest-geo-report',
    'geo-agent:get-geo-report',
    'geo-agent:get-latest-geo-question-set',
    'geo-agent:get-geo-question-set',
    'geo-agent:run-geo-source-discovery',
    'geo-agent:run-geo-source-discovery-stream',
    'geo-agent:get-latest-geo-source-discovery',
    'geo-agent:get-geo-source-discovery',
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
