const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { backendRequest, backendStreamRequest, startPythonBackend, stopPythonBackend } = require('./python.cjs');

const rootDir = path.resolve(__dirname, '..');
const isDev = !app.isPackaged;

let mainWindow = null;

async function createWindow() {
  await startPythonBackend({ app, rootDir });

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#09090b',
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

ipcMain.handle('geo-agent:health-check', async () => {
  return backendRequest('/health', {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:get-config-status', async () => {
  return backendRequest('/api/config/status', {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:send-chat', async (_event, payload) => {
  return backendRequest('/api/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
});

ipcMain.handle('geo-agent:send-chat-stream', async (event, { requestId, payload }) => {
  const channel = `geo-agent:chat-stream:${requestId}`;
  try {
    await backendStreamRequest(
      '/api/chat/stream',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      (streamEvent) => event.sender.send(channel, streamEvent)
    );
  } catch (error) {
    event.sender.send(channel, {
      type: 'error',
      error: error instanceof Error ? error.message : 'Chat stream failed',
    });
  }
});

ipcMain.handle('geo-agent:get-projects', async () => {
  return backendRequest('/api/projects', {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:ensure-geo-project', async (_event, projectId) => {
  return backendRequest('/api/geo/projects/ensure', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId }),
  });
});

ipcMain.handle('geo-agent:get-geo-projects', async (_event, projectId) => {
  const params = new URLSearchParams();
  if (projectId) {
    params.set('enterprise_project_id', projectId);
  }
  const query = params.toString();
  return backendRequest(`/api/geo/projects${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:get-geo-project', async (_event, geoProjectId) => {
  return backendRequest(`/api/geo/projects/${encodeURIComponent(geoProjectId)}`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:get-geo-workflow-state', async (_event, geoProjectId) => {
  return backendRequest(`/api/geo/projects/${encodeURIComponent(geoProjectId)}/workflow-state`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:create-geo-phase-two-prompt', async (_event, geoProjectId, platform = 'doubao', conversationId = null) => {
  return backendRequest(`/api/geo/projects/${encodeURIComponent(geoProjectId)}/platforms/${encodeURIComponent(platform)}/phase-2/prompt`, {
    method: 'POST',
    body: JSON.stringify({ conversation_id: conversationId }),
  });
});

ipcMain.handle('geo-agent:confirm-geo-phase-two', async (_event, geoProjectId, platform = 'doubao', messageId = null) => {
  return backendRequest(`/api/geo/projects/${encodeURIComponent(geoProjectId)}/platforms/${encodeURIComponent(platform)}/phase-2/confirm`, {
    method: 'POST',
    body: JSON.stringify({ message_id: messageId }),
  });
});

ipcMain.handle('geo-agent:cancel-geo-phase-two', async (_event, geoProjectId, platform = 'doubao', messageId = null) => {
  return backendRequest(`/api/geo/projects/${encodeURIComponent(geoProjectId)}/platforms/${encodeURIComponent(platform)}/phase-2/cancel`, {
    method: 'POST',
    body: JSON.stringify({ message_id: messageId }),
  });
});

ipcMain.handle('geo-agent:run-geo-phase-two-report', async (_event, geoProjectId, platform = 'doubao', messageId = null) => {
  return backendRequest(`/api/geo/projects/${encodeURIComponent(geoProjectId)}/platforms/${encodeURIComponent(platform)}/phase-2/run`, {
    method: 'POST',
    body: JSON.stringify({ message_id: messageId }),
  });
});

ipcMain.handle('geo-agent:run-geo-phase-two-report-stream', async (event, { requestId, payload }) => {
  const channel = `geo-agent:run-geo-phase-two-report-stream:${requestId}`;
  try {
    await backendStreamRequest(
      `/api/geo/projects/${encodeURIComponent(payload.geoProjectId)}/platforms/${encodeURIComponent(payload.platform || 'doubao')}/phase-2/run/stream`,
      {
        method: 'POST',
        body: JSON.stringify({ message_id: payload.messageId }),
      },
      (streamEvent) => event.sender.send(channel, streamEvent)
    );
  } catch (error) {
    event.sender.send(channel, {
      type: 'error',
      error: error instanceof Error ? error.message : 'Phase two stream failed',
    });
  }
});

ipcMain.handle('geo-agent:get-latest-geo-report', async (_event, geoProjectId, platform = 'doubao') => {
  return backendRequest(`/api/geo/projects/${encodeURIComponent(geoProjectId)}/platforms/${encodeURIComponent(platform)}/reports/latest`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:get-geo-report', async (_event, reportId) => {
  return backendRequest(`/api/geo/reports/${encodeURIComponent(reportId)}`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:get-latest-geo-question-set', async (_event, geoProjectId, platform = 'doubao') => {
  return backendRequest(`/api/geo/projects/${encodeURIComponent(geoProjectId)}/platforms/${encodeURIComponent(platform)}/question-sets/latest`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:get-geo-question-set', async (_event, questionSetId) => {
  return backendRequest(`/api/geo/question-sets/${encodeURIComponent(questionSetId)}`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:run-geo-source-discovery', async (_event, geoProjectId, platform = 'doubao', fallbackReport = null, messageId = null) => {
  return backendRequest(`/api/geo/projects/${encodeURIComponent(geoProjectId)}/platforms/${encodeURIComponent(platform)}/source-discovery/run`, {
    method: 'POST',
    body: JSON.stringify({ fallback_report: fallbackReport, message_id: messageId }),
  });
});

ipcMain.handle('geo-agent:run-geo-source-discovery-stream', async (event, { requestId, payload }) => {
  const channel = `geo-agent:run-geo-source-discovery-stream:${requestId}`;
  try {
    await backendStreamRequest(
      `/api/geo/projects/${encodeURIComponent(payload.geoProjectId)}/platforms/${encodeURIComponent(payload.platform || 'doubao')}/source-discovery/run/stream`,
      {
        method: 'POST',
        body: JSON.stringify({
          fallback_report: payload.fallbackReport,
          message_id: payload.messageId,
          conversation_id: payload.conversationId,
          parent_message_id: payload.parentMessageId,
        }),
      },
      (streamEvent) => event.sender.send(channel, streamEvent)
    );
  } catch (error) {
    event.sender.send(channel, {
      type: 'error',
      error: error instanceof Error ? error.message : 'Source discovery stream failed',
    });
  }
});

ipcMain.handle('geo-agent:get-latest-geo-source-discovery', async (_event, geoProjectId, platform = 'doubao') => {
  return backendRequest(`/api/geo/projects/${encodeURIComponent(geoProjectId)}/platforms/${encodeURIComponent(platform)}/source-discoveries/latest`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:get-geo-source-discovery', async (_event, discoveryId) => {
  return backendRequest(`/api/geo/source-discoveries/${encodeURIComponent(discoveryId)}`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:run-geo-article-draft', async (_event, geoProjectId, platform = 'doubao', articleType = 'consulting', options = {}) => {
  return backendRequest(`/api/geo/projects/${encodeURIComponent(geoProjectId)}/platforms/${encodeURIComponent(platform)}/articles/${encodeURIComponent(articleType)}/run`, {
    method: 'POST',
    body: JSON.stringify({
      topic: options?.topic,
      target_question: options?.targetQuestion,
      message_id: options?.messageId,
    }),
  });
});

ipcMain.handle('geo-agent:run-geo-support-articles', async (_event, geoProjectId, platform = 'doubao', options = {}) => {
  return backendRequest(`/api/geo/projects/${encodeURIComponent(geoProjectId)}/platforms/${encodeURIComponent(platform)}/articles/support/run`, {
    method: 'POST',
    body: JSON.stringify({
      message_id: options?.messageId,
      conversation_id: options?.conversationId,
      parent_message_id: options?.parentMessageId,
    }),
  });
});

ipcMain.handle('geo-agent:run-geo-support-articles-stream', async (event, { requestId, payload }) => {
  const channel = `geo-agent:run-geo-support-articles-stream:${requestId}`;
  try {
    await backendStreamRequest(
      `/api/geo/projects/${encodeURIComponent(payload.geoProjectId)}/platforms/${encodeURIComponent(payload.platform || 'doubao')}/articles/support/run/stream`,
      {
        method: 'POST',
        body: JSON.stringify({
          message_id: payload.options?.messageId,
          conversation_id: payload.options?.conversationId,
          parent_message_id: payload.options?.parentMessageId,
        }),
      },
      (streamEvent) => event.sender.send(channel, streamEvent)
    );
  } catch (error) {
    event.sender.send(channel, {
      type: 'error',
      error: error instanceof Error ? error.message : 'Support articles stream failed',
    });
  }
});

ipcMain.handle('geo-agent:get-latest-geo-article-draft', async (_event, geoProjectId, platform = 'doubao', articleType = 'consulting') => {
  const params = new URLSearchParams({ article_type: articleType });
  return backendRequest(`/api/geo/projects/${encodeURIComponent(geoProjectId)}/platforms/${encodeURIComponent(platform)}/articles/latest?${params.toString()}`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:get-geo-article-draft', async (_event, articleId) => {
  return backendRequest(`/api/geo/articles/${encodeURIComponent(articleId)}`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:confirm-geo-article-draft', async (_event, articleId, messageId = null) => {
  return backendRequest(`/api/geo/articles/${encodeURIComponent(articleId)}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ message_id: messageId }),
  });
});

ipcMain.handle('geo-agent:update-geo-article-draft', async (_event, articleId, draft = {}, messageId = null) => {
  return backendRequest(`/api/geo/articles/${encodeURIComponent(articleId)}/update`, {
    method: 'POST',
    body: JSON.stringify({ draft, message_id: messageId }),
  });
});

ipcMain.handle('geo-agent:get-conversations', async (_event, { projectId, limit } = {}) => {
  const params = new URLSearchParams();
  if (projectId) {
    params.set('project_id', projectId);
  }
  if (limit) {
    params.set('limit', String(limit));
  }
  const query = params.toString();
  return backendRequest(`/api/conversations${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:get-conversation', async (_event, conversationId) => {
  return backendRequest(`/api/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:delete-conversation', async (_event, conversationId) => {
  return backendRequest(`/api/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE',
  });
});

ipcMain.handle('geo-agent:clear-conversation-history', async () => {
  return backendRequest('/api/conversations/clear', {
    method: 'POST',
  });
});

ipcMain.handle('geo-agent:get-knowledge-entries', async (_event, { projectId, limit } = {}) => {
  const params = new URLSearchParams();
  if (projectId) {
    params.set('project_id', projectId);
  }
  if (limit) {
    params.set('limit', String(limit));
  }
  const query = params.toString();
  return backendRequest(`/api/knowledge/entries${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:create-knowledge-entry', async (_event, entry) => {
  return backendRequest('/api/knowledge/entries', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
});

ipcMain.handle('geo-agent:search-knowledge', async (_event, { query, projectId, limit } = {}) => {
  return backendRequest('/api/knowledge/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      project_id: projectId,
      limit,
    }),
  });
});

ipcMain.handle('geo-agent:save-enterprise-profile', async (_event, profile) => {
  return backendRequest('/api/knowledge/enterprise-profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  });
});

ipcMain.handle('geo-agent:get-knowledge-profiles', async () => {
  return backendRequest('/api/knowledge/profiles', {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:get-knowledge-profile', async (_event, projectId) => {
  return backendRequest(`/api/knowledge/profiles/${encodeURIComponent(projectId)}`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:update-knowledge-profile', async (_event, { projectId, profile }) => {
  return backendRequest(`/api/knowledge/profiles/${encodeURIComponent(projectId)}`, {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
});

ipcMain.handle('geo-agent:delete-knowledge-profile', async (_event, projectId) => {
  return backendRequest(`/api/knowledge/profiles/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  });
});

ipcMain.handle('geo-agent:create-knowledge-asset', async (_event, asset) => {
  return backendRequest('/api/knowledge/assets', {
    method: 'POST',
    body: JSON.stringify(asset),
  });
});

ipcMain.handle('geo-agent:create-knowledge-draft', async (_event, draft) => {
  return backendRequest('/api/knowledge/drafts', {
    method: 'POST',
    body: JSON.stringify(draft),
  });
});

ipcMain.handle('geo-agent:confirm-knowledge-draft', async (_event, { draftId, profile }) => {
  return backendRequest(`/api/knowledge/drafts/${encodeURIComponent(draftId)}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ profile }),
  });
});

ipcMain.handle('geo-agent:reject-knowledge-draft', async (_event, draftId) => {
  return backendRequest(`/api/knowledge/drafts/${encodeURIComponent(draftId)}/reject`, {
    method: 'POST',
  });
});

ipcMain.handle('geo-agent:reindex-knowledge', async (_event, projectId) => {
  return backendRequest(`/api/knowledge/reindex/${encodeURIComponent(projectId)}`, {
    method: 'POST',
  });
});

ipcMain.handle('geo-agent:get-knowledge-index-status', async (_event, projectId) => {
  const params = new URLSearchParams();
  if (projectId) {
    params.set('project_id', projectId);
  }
  const query = params.toString();
  return backendRequest(`/api/knowledge/index-status${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
});

ipcMain.handle('geo-agent:get-skills', async () => {
  return backendRequest('/api/skills', {
    method: 'GET',
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopPythonBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopPythonBackend();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
