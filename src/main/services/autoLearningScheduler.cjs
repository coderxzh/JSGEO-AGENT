'use strict';

const DEFAULT_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 小时
const STATE_KEY_LAST_RUN = 'last_run_at';
const STATE_KEY_INTERVAL = 'interval_ms';

let timerId = null;
let isRunning = false;
let databaseRef = null;

/**
 * 初始化调度器，传入数据库实例
 * @param {import('better-sqlite3').Database} database
 */
function init(database) {
  databaseRef = database;
}

/**
 * 获取调度状态
 */
function getStatus() {
  if (!databaseRef) return null;
  const row = databaseRef.prepare('SELECT value FROM scheduler_state WHERE key = ?').get(STATE_KEY_LAST_RUN);
  const intervalRow = databaseRef.prepare('SELECT value FROM scheduler_state WHERE key = ?').get(STATE_KEY_INTERVAL);
  const lastRunAt = row?.value || null;
  const intervalMs = intervalRow ? Number(intervalRow.value) : DEFAULT_INTERVAL_MS;
  const nextRunAt = lastRunAt
    ? new Date(new Date(lastRunAt).getTime() + intervalMs).toISOString()
    : new Date().toISOString();
  return {
    isRunning,
    lastRunAt,
    nextRunAt,
    intervalMs,
  };
}

/**
 * 更新调度状态
 */
function setState(key, value) {
  if (!databaseRef) return;
  databaseRef.prepare(`
    INSERT INTO scheduler_state (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, String(value));
}

/**
 * 执行一次完整的自动学习周期
 */
async function runCycle() {
  if (isRunning || !databaseRef) return null;
  isRunning = true;
  try {
    // 查询所有有已发布 URL 的项目
    const projects = databaseRef.prepare(`
      SELECT DISTINCT p.id, p.name
      FROM projects p
      INNER JOIN publish_orders po ON po.project_id = p.id
      WHERE po.published_url IS NOT NULL
        AND po.published_url != ''
    `).all();

    let projectsChecked = 0;
    let visibilityDetected = 0;
    let rulesGenerated = 0;

    // 延迟加载服务（避免循环依赖）
    const autoLearningVisibilityService = require('./autoLearningVisibilityService.cjs');
    const reflectionService = require('./reflectionService.cjs');
    const globalRuleService = require('./globalRuleService.cjs');

    for (const project of projects) {
      try {
        // 项目管理：检查该企业是否开启了反思优化
        const projectRow = databaseRef.prepare('SELECT reflection_enabled FROM projects WHERE id = ?').get(project.id);
        if (projectRow && projectRow.reflection_enabled === 0) {
          console.log(`[AutoLearningScheduler] 项目 ${project.id} 已关闭反思优化，跳过。`);
          continue;
        }

        projectsChecked++;
        const projectId = project.id;

        // 执行 Phase 6 可见性检测（豆包助手联网）
        const checkResult = await autoLearningVisibilityService.runAutoLearningVisibility(
          `geo-${projectId}`,
          'doubao',
        );

        if (!checkResult) continue;

        // 分析是否被收录：必须检测到已发布 URL 被引用
        const questionResults = checkResult.result?.question_results ?? [];
        const matchedUrls = questionResults.flatMap((r) => r.matched_published_urls || []);
        if (matchedUrls.length === 0) {
          console.log(`[AutoLearningScheduler] 项目 ${project.id} 未检测到已发布 URL 被引用，跳过反思。`);
          continue;
        }
        visibilityDetected++;

        // 执行 Phase 7 反思学习
        const reflectionResult = await reflectionService.generateReflection(
          `geo-${projectId}`,
          'doubao',
          checkResult.id,
        );

        if (reflectionResult?.rules?.length > 0) {
          rulesGenerated += reflectionResult.rules.length;
        }
      } catch (projectError) {
        console.error(`[AutoLearningScheduler] 项目 ${project.id} 执行失败:`, projectError.message);
      }
    }

    // 提取全局规则（增量处理新文章）
    try {
      await globalRuleService.processNewArticles(
        async (article) => {
          // 提取文章的标题和结构模式
          // 这里可以先返回空数组，后续通过 LLM 实现
          return [];
        },
        async (patterns, existingRules) => {
          // 合并模式到全局规则
          // 这里可以先返回空结果，后续通过 LLM 实现
          return { created: 0 };
        }
      );
    } catch (globalErr) {
      console.error('[AutoLearningScheduler] 全局规则提取失败:', globalErr.message);
    }

    // 更新最后执行时间
    setState(STATE_KEY_LAST_RUN, new Date().toISOString());

    const result = { projectsChecked, visibilityDetected, rulesGenerated };
    console.log('[AutoLearningScheduler] 周期执行完成:', result);
    return result;
  } finally {
    isRunning = false;
  }
}

/**
 * 检查是否需要立即执行并启动定时器
 */
function start() {
  if (!databaseRef) {
    console.error('[AutoLearningScheduler] 未初始化数据库，无法启动');
    return;
  }

  const lastRunAt = databaseRef.prepare('SELECT value FROM scheduler_state WHERE key = ?')
    .get(STATE_KEY_LAST_RUN)?.value;
  const intervalRow = databaseRef.prepare('SELECT value FROM scheduler_state WHERE key = ?')
    .get(STATE_KEY_INTERVAL);
  const intervalMs = intervalRow ? Number(intervalRow.value) : DEFAULT_INTERVAL_MS;

  // 启动时补偿检查
  if (!lastRunAt || Date.now() - new Date(lastRunAt).getTime() >= intervalMs) {
    console.log('[AutoLearningScheduler] 启动补偿执行');
    runCycle().catch((err) => console.error('[AutoLearningScheduler] 补偿执行失败:', err));
  }

  // 启动定时器
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    console.log('[AutoLearningScheduler] 定时执行');
    runCycle().catch((err) => console.error('[AutoLearningScheduler] 定时执行失败:', err));
  }, intervalMs);

  console.log(`[AutoLearningScheduler] 已启动，间隔 ${intervalMs / 1000 / 60} 分钟`);
}

/**
 * 停止定时器
 */
function stop() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  console.log('[AutoLearningScheduler] 已停止');
}

/**
 * 修改执行间隔
 */
function setIntervalMs(ms) {
  if (typeof ms !== 'number' || ms < 60000) return false;
  setState(STATE_KEY_INTERVAL, String(ms));
  // 重启定时器以应用新间隔
  stop();
  start();
  return true;
}

module.exports = {
  init,
  start,
  stop,
  runCycle,
  getStatus,
  setIntervalMs,
};
