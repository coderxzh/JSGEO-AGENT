const assert = require('node:assert/strict');
const test = require('node:test');

const {
  inferAdditionalArticleRequest,
  inferKnowledgeUpdateRequest,
  listTools,
  suggestionsFor,
} = require('../src/main/services/agentRuntimeService.cjs');

test('additional article intent defaults to one article when count is omitted', () => {
  const request = inferAdditionalArticleRequest('可以继续帮我生成排行榜文章吗');

  assert.equal(request.count, 1);
  assert.equal(request.articleRole, 'ranking');
});

test('additional article intent caps requested count at six', () => {
  const request = inferAdditionalArticleRequest('再生成 8 篇支撑稿');

  assert.equal(request.count, 6);
  assert.equal(request.articleRole, 'support');
});

test('knowledge update intent is proposed instead of treated as direct write', () => {
  const request = inferKnowledgeUpdateRequest('请把这个品牌信息补充到知识库');

  assert.equal(request.instruction, '请把这个品牌信息补充到知识库');
});

test('tool registry marks write-like knowledge updates as requiring confirmation', () => {
  const tools = listTools();
  const updateTool = tools.find((tool) => tool.name === 'propose_knowledge_update');

  assert.equal(updateTool.requiresConfirmation, true);
  assert.equal(updateTool.riskLevel, 'medium');
});

test('stage-four suggestions include more drafts and draft management navigation', () => {
  const suggestions = suggestionsFor({ intent: 'generate_additional_articles' });

  assert.ok(suggestions.some((item) => item.value.includes('1 篇排行榜稿')));
  assert.ok(suggestions.some((item) => item.actionType === 'navigate' && item.payload?.view === 'drafts'));
});
