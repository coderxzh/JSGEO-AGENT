const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { app, dialog, shell } = require('electron');
const knowledgeService = require('./knowledgeService.cjs');
const skillService = require('./skillService.cjs');
const { streamLLM } = require('./llmGateway.cjs');
const { getTaskPolicy } = require('./modelPolicyService.cjs');
const { getDb } = require('./databaseService.cjs');

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const WEBSITES_DIR = 'websites';

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function getWebsitesBaseDir() {
  return path.join(app.getPath('userData'), WEBSITES_DIR);
}

function getWebsiteStorageDir(websiteId) {
  return path.join(getWebsitesBaseDir(), websiteId);
}

function now() {
  return new Date().toISOString();
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'site';
}

function parseJsonSafe(text) {
  if (!text) return null;
  let cleaned = String(text).trim();
  // 剥离 markdown 代码块
  const fencedMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fencedMatch) cleaned = fencedMatch[1].trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // 尝试括号平衡
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch { /* ignore */ }
    }
    return null;
  }
}

function extractHtmlFromResponse(text) {
  if (!text) return '';
  let cleaned = String(text).trim();
  // 剥离 markdown 代码块
  const fencedMatch = cleaned.match(/```(?:html)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fencedMatch) cleaned = fencedMatch[1].trim();
  // 如果包含 <html 或 <DOCTYPE，认为是 HTML
  if (/<(!DOCTYPE|html)/i.test(cleaned)) return cleaned;
  return cleaned;
}

// ---------------------------------------------------------------------------
// 本地预览 HTTP 服务
// ---------------------------------------------------------------------------

let previewServer = null;
let previewPort = 0;
let previewWebsiteId = null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function startPreviewServer(websiteId) {
  // 如果已经在服务同一个网站，直接返回
  if (previewServer && previewWebsiteId === websiteId && previewPort > 0) {
    return `http://localhost:${previewPort}`;
  }
  // 关闭旧服务
  stopPreviewServer();

  const storageDir = getWebsiteStorageDir(websiteId);
  if (!fs.existsSync(storageDir)) return null;

  previewServer = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url || '/index.html');
    // 安全检查：防止路径穿越
    const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(storageDir, safePath);

    if (!filePath.startsWith(storageDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    previewServer.listen(0, '127.0.0.1', () => {
      previewPort = previewServer.address().port;
      previewWebsiteId = websiteId;
      resolve(`http://localhost:${previewPort}`);
    });
  });
}

function stopPreviewServer() {
  if (previewServer) {
    try { previewServer.close(); } catch { /* ignore */ }
    previewServer = null;
    previewPort = 0;
    previewWebsiteId = null;
  }
}

// ---------------------------------------------------------------------------
// 数据库操作
// ---------------------------------------------------------------------------

function insertWebsite(website) {
  const db = getDb();
  db.prepare(`
    INSERT INTO websites (id, project_id, name, slug, status, site_plan_json, brand_config_json, storage_dir, error_message, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    website.id, website.project_id, website.name, website.slug,
    website.status, website.site_plan_json || null,
    website.brand_config_json || null, website.storage_dir || null,
    website.error_message || null, website.created_at, website.updated_at
  );
}

function updateWebsite(websiteId, updates) {
  const db = getDb();
  const sets = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    sets.push(`${key} = ?`);
    values.push(value);
  }
  sets.push('updated_at = ?');
  values.push(now());
  values.push(websiteId);
  db.prepare(`UPDATE websites SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

function insertPage(page) {
  const db = getDb();
  db.prepare(`
    INSERT INTO website_pages (id, website_id, page_slug, title, meta_description, html_content, page_order, status, error_message, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    page.id, page.website_id, page.page_slug, page.title,
    page.meta_description || null, page.html_content || null,
    page.page_order, page.status, page.error_message || null,
    page.created_at, page.updated_at
  );
}

function updatePage(pageId, updates) {
  const db = getDb();
  const sets = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    sets.push(`${key} = ?`);
    values.push(value);
  }
  sets.push('updated_at = ?');
  values.push(now());
  values.push(pageId);
  db.prepare(`UPDATE website_pages SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

function rowToWebsite(row) {
  if (!row) return null;
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    site_plan: parseJsonSafe(row.site_plan_json),
    brand_config: parseJsonSafe(row.brand_config_json),
    storage_dir: row.storage_dir,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToPage(row) {
  if (!row) return null;
  return {
    id: row.id,
    website_id: row.website_id,
    page_slug: row.page_slug,
    title: row.title,
    meta_description: row.meta_description,
    html_content: row.html_content,
    page_order: row.page_order,
    status: row.status,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// 公开 API
// ---------------------------------------------------------------------------

/**
 * 列出项目下的所有网站
 */
function listWebsites(projectId) {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM websites WHERE project_id = ? ORDER BY created_at DESC'
  ).all(projectId);
  return rows.map(rowToWebsite);
}

/**
 * 获取单个网站
 */
function getWebsite(websiteId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM websites WHERE id = ?').get(websiteId);
  return rowToWebsite(row);
}

/**
 * 获取网站的所有页面
 */
function getWebsitePages(websiteId) {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM website_pages WHERE website_id = ? ORDER BY page_order ASC'
  ).all(websiteId);
  return rows.map(rowToPage);
}

/**
 * 获取单个页面
 */
function getWebsitePage(pageId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM website_pages WHERE id = ?').get(pageId);
  return rowToPage(row);
}

/**
 * 获取页面的 HTML 内容（从磁盘读取，若磁盘无则从数据库读）
 */
function getWebsitePreviewHtml(websiteId, pageSlug) {
  const slug = pageSlug || 'index';
  // 优先从磁盘读取
  const filePath = path.join(getWebsiteStorageDir(websiteId), `${slug}.html`);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  // 回退到数据库
  const db = getDb();
  const row = db.prepare(
    'SELECT html_content FROM website_pages WHERE website_id = ? AND page_slug = ?'
  ).get(websiteId, slug);
  return row?.html_content || null;
}

/**
 * 获取预览 HTTP 服务基础 URL
 */
async function getWebsitePreviewBaseUrl(websiteId) {
  const url = await startPreviewServer(websiteId);
  return url;
}

/**
 * 停止预览服务
 */
function stopWebsitePreview() {
  stopPreviewServer();
}

/**
 * 删除网站（数据库 + 磁盘文件）
 */
function deleteWebsite(websiteId) {
  const db = getDb();
  db.prepare('DELETE FROM website_pages WHERE website_id = ?').run(websiteId);
  db.prepare('DELETE FROM websites WHERE id = ?').run(websiteId);
  // 删除磁盘文件
  const dir = getWebsiteStorageDir(websiteId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  if (previewWebsiteId === websiteId) {
    stopPreviewServer();
  }
  return { success: true };
}

/**
 * 导出网站为 zip
 */
async function exportWebsiteZip(websiteId) {
  const website = getWebsite(websiteId);
  if (!website) throw new Error('网站不存在');

  const storageDir = getWebsiteStorageDir(websiteId);
  if (!fs.existsSync(storageDir)) throw new Error('网站文件不存在');

  // 让用户选择保存路径
  const defaultName = `${website.name || 'website'}.zip`;
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [
      { name: 'ZIP 文件', extensions: ['zip'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  // 收集所有 HTML 文件
  const files = fs.readdirSync(storageDir).filter((f) => f.endsWith('.html'));
  // 使用 Electron 的 shell 打开文件夹作为备选方案
  // 简单方案：复制整个目录到用户选择的位置（作为文件夹）
  const outDir = result.filePath.replace(/\.zip$/i, '');
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of files) {
    fs.copyFileSync(path.join(storageDir, file), path.join(outDir, file));
  }
  // 也复制非 HTML 的资源文件
  const allFiles = fs.readdirSync(storageDir);
  for (const file of allFiles) {
    const src = path.join(storageDir, file);
    const dest = path.join(outDir, file);
    if (fs.statSync(src).isFile() && !files.includes(file)) {
      fs.copyFileSync(src, dest);
    }
  }

  shell.showItemInFolder(outDir);
  return { success: true, path: outDir };
}

// ---------------------------------------------------------------------------
// 生成流程
// ---------------------------------------------------------------------------

/**
 * 构建企业知识上下文
 */
async function buildKnowledgeContext(projectId) {
  // 获取企业画像（容错：没有画像时返回空对象）
  let profile = { profile: {}, entries: [], total: 0 };
  try {
    profile = knowledgeService.getKnowledgeProfile(projectId);
  } catch (err) {
    console.warn('[WebBuilder] 获取企业画像失败，使用空画像:', err.message);
  }
  // 检索相关知识
  const queries = [
    '企业介绍 公司概况 品牌',
    '产品服务 业务范围 技术能力',
    '联系方式 地址 电话',
    '案例 客户 项目成果',
  ];
  const allChunks = [];
  for (const query of queries) {
    try {
      const result = await knowledgeService.searchKnowledge({ projectId, query, limit: 5 });
      if (result.entries) allChunks.push(...result.entries);
    } catch { /* 忽略检索失败 */ }
  }
  // 去重
  const seen = new Set();
  const uniqueChunks = allChunks.filter((chunk) => {
    if (seen.has(chunk.id)) return false;
    seen.add(chunk.id);
    return true;
  });
  return { profile, chunks: uniqueChunks.slice(0, 20) };
}

/**
 * 构建 LLM 消息
 */
function buildPlanMessages(skillContent, knowledgeContext, userRequirements) {
  const { profile, chunks } = knowledgeContext;
  // 从画像中提取关键信息
  const profileData = profile?.profile || {};
  const evidenceFields = {};
  for (const [key, val] of Object.entries(profileData)) {
    if (val && typeof val === 'object' && val.value !== undefined) {
      evidenceFields[key] = val.value;
    } else if (typeof val === 'string') {
      evidenceFields[key] = val;
    }
  }

  const chunksText = chunks
    .map((c) => `- [${c.title || '无标题'}] ${(c.content || '').slice(0, 500)}`)
    .join('\n');

  const systemPrompt = `${skillContent}

## 当前企业数据

画像信息：
${JSON.stringify(evidenceFields, null, 2)}

知识库内容：
${chunksText || '（暂无知识库内容）'}

## 用户需求

${userRequirements || '（用户未提供额外要求，请根据企业数据自动生成合适的网站结构）'}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: '请根据以上企业数据和 SEO 规则，先输出站点规划 JSON（Phase 1）。输出合法 JSON，不要输出解释性文本。' },
  ];
}

function buildPageMessages(skillContent, sitePlan, pageInfo, knowledgeContext, previousPagesSummary) {
  const { profile, chunks } = knowledgeContext;
  const profileData = profile?.profile || {};
  const evidenceFields = {};
  for (const [key, val] of Object.entries(profileData)) {
    if (val && typeof val === 'object' && val.value !== undefined) {
      evidenceFields[key] = val.value;
    } else if (typeof val === 'string') {
      evidenceFields[key] = val;
    }
  }

  const chunksText = chunks
    .map((c) => `- [${c.title || '无标题'}] ${(c.content || '').slice(0, 500)}`)
    .join('\n');

  const systemPrompt = `${skillContent}

## 站点规划

${JSON.stringify(sitePlan, null, 2)}

## 企业数据

${JSON.stringify(evidenceFields, null, 2)}

## 知识库内容

${chunksText || '（暂无知识库内容）'}

## 已生成的页面摘要

${previousPagesSummary || '（这是第一个页面）'}`;

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `请生成「${pageInfo.title}」页面的完整 HTML。
页面 slug: ${pageInfo.slug}
页面用途: ${pageInfo.purpose || pageInfo.title}
Meta 描述: ${pageInfo.meta_description || ''}

输出完整的 HTML 文件内容，不要输出解释性文本。确保导航栏中当前页面使用 aria-current="page"。`,
    },
  ];
}

/**
 * 生成网站 — 流式入口
 */
async function generateWebsite(projectId, options = {}, onEvent = null) {
  console.log('[WebBuilder] generateWebsite start', { projectId, options });
  const startTime = now();
  const websiteId = crypto.randomUUID();
  const siteName = options.site_name || '企业网站';
  const userRequirements = options.requirements || '';
  const brandColor = options.brand_color || '#1a73e8';

  // 创建存储目录
  const storageDir = getWebsiteStorageDir(websiteId);
  fs.mkdirSync(storageDir, { recursive: true });

  // 创建数据库记录
  const website = {
    id: websiteId,
    project_id: projectId,
    name: siteName,
    slug: slugify(siteName),
    status: 'generating',
    site_plan_json: null,
    brand_config_json: JSON.stringify({ primary_color: brandColor }),
    storage_dir: storageDir,
    created_at: startTime,
    updated_at: startTime,
  };
  insertWebsite(website);

  onEvent?.({ type: 'status', message: '正在分析企业知识库...' });

  try {
    // 1. 加载知识上下文
    const knowledgeContext = await buildKnowledgeContext(projectId);

    // 2. 加载 skill
    const skill = skillService.getSkill('web-builder-seo');
    if (!skill) throw new Error('找不到 web-builder-seo 技能文件');
    const skillContent = skill.content;

    // 3. Phase 1 — 生成站点规划
    onEvent?.({ type: 'status', message: '正在生成站点规划...' });
    const planMessages = buildPlanMessages(skillContent, knowledgeContext, userRequirements);
    const planPolicy = getTaskPolicy('website_generation');

    const planResult = await streamLLM({
      messages: planMessages,
      temperature: 0.3,
      maxTokens: 4000,
      provider: planPolicy.provider,
      model: planPolicy.model,
      taskType: 'website_generation',
      apiFamily: planPolicy.api_family,
      forceNoResponseFormat: true,
      onEvent: (event) => {
        if (event.type === 'reasoning_delta') onEvent?.(event);
      },
    });

    const sitePlan = parseJsonSafe(planResult.content);
    if (!sitePlan || !sitePlan.pages || !Array.isArray(sitePlan.pages)) {
      throw new Error('站点规划解析失败，请重试');
    }

    // 更新网站记录
    updateWebsite(websiteId, {
      site_plan_json: JSON.stringify(sitePlan),
      name: sitePlan.site_name || siteName,
      brand_config_json: JSON.stringify({
        primary_color: sitePlan.brand_color || brandColor,
        font_family: sitePlan.font_family || 'system-ui, -apple-system, sans-serif',
      }),
    });

    onEvent?.({ type: 'site_plan', plan: sitePlan });

    // 4. Phase 2 — 逐页生成
    const pages = sitePlan.pages;
    const totalPages = pages.length;
    const pageRecords = [];

    for (let i = 0; i < totalPages; i++) {
      const pageInfo = pages[i];
      const pageId = crypto.randomUUID();
      const pageSlug = pageInfo.slug || `page-${i}`;
      const pageTitle = pageInfo.title || `页面 ${i + 1}`;

      onEvent?.({
        type: 'page_progress',
        page_index: i,
        page_slug: pageSlug,
        page_title: pageTitle,
        status: 'generating',
        total: totalPages,
      });

      // 插入页面记录
      const pageRecord = {
        id: pageId,
        website_id: websiteId,
        page_slug: pageSlug,
        title: pageTitle,
        meta_description: pageInfo.meta_description || '',
        html_content: null,
        page_order: i,
        status: 'generating',
        created_at: now(),
        updated_at: now(),
      };
      insertPage(pageRecord);
      pageRecords.push(pageRecord);

      // 构建已生成页面摘要
      const previousSummary = pageRecords
        .slice(0, i)
        .map((p) => `- ${p.title} (${p.page_slug}.html)`)
        .join('\n') || '';

      try {
        const pageMessages = buildPageMessages(
          skillContent, sitePlan, pageInfo, knowledgeContext, previousSummary
        );

        const pageResult = await streamLLM({
          messages: pageMessages,
          temperature: 0.3,
          maxTokens: 16000,
          provider: planPolicy.provider,
          model: planPolicy.model,
          taskType: 'website_generation',
          apiFamily: planPolicy.api_family,
          forceNoResponseFormat: true,
          onEvent: (event) => {
            if (event.type === 'reasoning_delta') onEvent?.(event);
          },
        });

        const htmlContent = extractHtmlFromResponse(pageResult.content);
        if (!htmlContent || htmlContent.length < 100) {
          throw new Error('生成的页面内容为空或过短');
        }

        // 写入磁盘
        const fileName = pageSlug === 'index' ? 'index.html' : `${pageSlug}.html`;
        fs.writeFileSync(path.join(storageDir, fileName), htmlContent, 'utf-8');

        // 更新数据库
        updatePage(pageId, {
          html_content: htmlContent,
          status: 'ready',
        });

        pageRecord.html_content = htmlContent;
        pageRecord.status = 'ready';

        onEvent?.({
          type: 'page_progress',
          page_index: i,
          page_slug: pageSlug,
          page_title: pageTitle,
          status: 'ready',
          total: totalPages,
        });
      } catch (pageErr) {
        updatePage(pageId, {
          status: 'failed',
          error_message: pageErr.message,
        });
        pageRecord.status = 'failed';
        pageRecord.error_message = pageErr.message;

        onEvent?.({
          type: 'page_progress',
          page_index: i,
          page_slug: pageSlug,
          page_title: pageTitle,
          status: 'failed',
          error_message: pageErr.message,
          total: totalPages,
        });
      }
    }

    // 5. 更新网站状态
    const failedPages = pageRecords.filter((p) => p.status === 'failed').length;
    const finalStatus = failedPages === totalPages ? 'failed' : 'ready';
    updateWebsite(websiteId, { status: finalStatus });

    const updatedWebsite = getWebsite(websiteId);
    onEvent?.({ type: 'done', website: updatedWebsite });

    return updatedWebsite;
  } catch (err) {
    updateWebsite(websiteId, {
      status: 'failed',
      error_message: err.message,
    });
    // 发送 error 事件，不发 done（让 IPC handler 决定是否发 done）
    onEvent?.({ type: 'error', error: err.message });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 导出
// ---------------------------------------------------------------------------

module.exports = {
  listWebsites,
  getWebsite,
  getWebsitePages,
  getWebsitePage,
  getWebsitePreviewHtml,
  getWebsitePreviewBaseUrl,
  stopWebsitePreview,
  deleteWebsite,
  exportWebsiteZip,
  generateWebsite,
};
