const assert = require('node:assert/strict');
const test = require('node:test');

const {
  inferAdditionalArticleRequest,
  inferArticleRevisionRequest,
  inferKnowledgeUpdateRequest,
  inferViewKnowledgeRequest,
  listTools,
  resolveIntent,
  suggestionsFor,
  toolDefinitions,
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

test('article revision intent is proposed instead of overwriting a draft', () => {
  const request = inferArticleRevisionRequest('把这篇稿件语气改得更客观');

  assert.equal(request.instruction, '把这篇稿件语气改得更客观');
});

test('view knowledge intent routes to a read-only tool', () => {
  const request = inferViewKnowledgeRequest('查看当前企业知识库');

  assert.equal(request.instruction, '查看当前企业知识库');
});

test('tool registry exposes schema, validation, execution and suggestion protocol', () => {
  const tools = listTools();
  const expected = [
    'generate_additional_articles',
    'propose_knowledge_update',
    'propose_article_revision',
    'view_knowledge_profile',
  ];

  expected.forEach((name) => {
    const tool = tools.find((item) => item.name === name);
    assert.ok(tool, `${name} should be registered`);
    assert.ok(tool.inputSchema, `${name} should expose inputSchema`);
    assert.equal(tool.validate, true);
    assert.equal(tool.execute, true);
    assert.equal(tool.toSuggestions, true);
    assert.equal(typeof toolDefinitions[name].validate, 'function');
    assert.equal(typeof toolDefinitions[name].execute, 'function');
    assert.equal(typeof toolDefinitions[name].toSuggestions, 'function');
  });
});

test('tool registry marks write-like knowledge updates as requiring confirmation', () => {
  const tools = listTools();
  const updateTool = tools.find((tool) => tool.name === 'propose_knowledge_update');

  assert.equal(updateTool.requiresConfirmation, true);
  assert.equal(updateTool.riskLevel, 'medium');
});

test('runtime routes high-value intents to their tools', () => {
  assert.equal(resolveIntent({ message: '再生成 8 篇支撑稿' }).toolName, 'generate_additional_articles');
  assert.equal(resolveIntent({ message: '请把这个品牌信息补充到知识库' }).toolName, 'propose_knowledge_update');
  assert.equal(resolveIntent({ message: '把这篇稿件语气改得更客观' }).toolName, 'propose_article_revision');
  assert.equal(resolveIntent({ message: '查看当前企业知识库' }).toolName, 'view_knowledge_profile');
});

test('stage-four suggestions include more drafts and draft management navigation', () => {
  const suggestions = suggestionsFor({ intent: 'generate_additional_articles' });

  assert.ok(suggestions.some((item) => item.value.includes('1 篇排行榜稿')));
  assert.ok(suggestions.some((item) => item.actionType === 'navigate' && item.payload?.view === 'drafts'));
});

test('pending action suggestions prioritize confirmation workflow', () => {
  const suggestions = suggestionsFor({
    pendingAction: {
      type: 'knowledge_update',
      title: '待确认知识库更新',
      payload: { patch: { company_name: { value: '测试企业' } } },
    },
  });

  assert.equal(suggestions[0].actionType, 'propose_action');
  assert.ok(suggestions.some((item) => item.value.includes('取消')));
});
