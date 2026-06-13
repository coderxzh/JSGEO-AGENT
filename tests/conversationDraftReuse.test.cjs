const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

function mockModule(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

test('pending draft conversations are visible but not reusable for a second create flow', () => {
  const servicePath = path.resolve(__dirname, '../src/main/services/conversationService.cjs');
  const servicesDir = path.dirname(servicePath);
  const conversations = new Map([
    ['conversation-pending', { recoverable: true, reusable: false }],
    ['conversation-failed', { recoverable: true, reusable: true }],
    ['conversation-failed-with-draft-card', { recoverable: true, reusable: false }],
  ]);

  delete require.cache[servicePath];
  mockModule(path.join(servicesDir, 'databaseService.cjs'), {
    getDb: () => ({
      prepare: (sql) => ({
        get: (conversationId) => {
          const row = conversations.get(conversationId);
          if (!row) return undefined;
          return sql.includes('knowledge_drafts kd')
            && sql.includes("kd.status IN ('interrupted', 'failed')")
            ? row.reusable ? { id: conversationId } : undefined
            : row.recoverable ? { id: conversationId } : undefined;
        },
      }),
    }),
  });
  mockModule(path.join(servicesDir, 'llmGateway.cjs'), { chatCompletion: async () => ({ text: '' }) });
  mockModule(path.join(servicesDir, 'modelPolicyService.cjs'), { getTaskPolicy: () => ({}) });
  mockModule(path.join(servicesDir, 'profileFieldService.cjs'), { fieldText: () => '' });

  const conversationService = require(servicePath);

  assert.equal(conversationService.isRecoverableDraftConversation('conversation-pending'), true);
  assert.equal(conversationService.canReuseDraftConversationForCreate('conversation-pending'), false);
  assert.equal(conversationService.canReuseDraftConversationForCreate('conversation-failed'), true);
  assert.equal(conversationService.canReuseDraftConversationForCreate('conversation-failed-with-draft-card'), false);
});
