const conversationService = require('./conversationService.cjs');
const contextWindowService = require('./contextWindowService.cjs');
const llmGateway = require('./llmGateway.cjs');
const articleDraftService = require('./articleDraftService.cjs');
const traceService = require('./agentTraceService.cjs');
const { getTaskPolicy } = require('./modelPolicyService.cjs');

const MAX_ADDITIONAL_ARTICLES = 6;

const TOOL_REGISTRY = [
  {
    name: 'generate_additional_articles',
    description: '阶段四完成后追加生成完整稿件，并保存为 draft。',
    riskLevel: 'low',
    requiresConfirmation: false,
    taskPolicy: 'support_content_generation',
  },
  {
    name: 'propose_knowledge_update',
    description: '根据用户指令生成待确认知识库更新动作；确认前不写库。',
    riskLevel: 'medium',
    requiresConfirmation: true,
    taskPolicy: 'rag_chat',
  },
  {
    name: 'chat_with_context',
    description: '围绕当前企业、阶段、稿件和历史对话回答。',
    riskLevel: 'low',
    requiresConfirmation: false,
    taskPolicy: 'rag_chat',
  },
];

function clampCount(value) {
  const number = Number(value || 1);
  if (!Number.isFinite(number)) return 1;
  return Math.min(MAX_ADDITIONAL_ARTICLES, Math.max(1, Math.floor(number)));
}

function parseRequestedArticleCount(text) {
  const value = String(text || '');
  const digitMatch = value.match(/(\d{1,2})\s*(篇|个|条)?/);
  if (digitMatch) return clampCount(digitMatch[1]);
  const cnMap = {
    一: 1,
    两: 2,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };
  const cnMatch = value.match(/([一两二三四五六七八九十])\s*(篇|个|条)?/);
  return cnMatch ? clampCount(cnMap[cnMatch[1]] || 1) : 1;
}

function inferAdditionalArticleRequest(text) {
  const value = String(text || '').trim();
  if (!value) return null;
  const asksArticle = /(文章|稿件|内容|排行榜稿|支撑稿|测评稿|咨询稿)/.test(value);
  const asksMore = /(继续|再|另|补充|加|生成|写|来)/.test(value);
  if (!asksArticle || !asksMore) return null;
  return {
    count: parseRequestedArticleCount(value),
    articleRole: /(排行|榜单|TOP|top)/.test(value)
      ? 'ranking'
      : /(支撑|科普|咨询|测评|案例|品牌)/.test(value)
        ? 'support'
        : 'auto',
    instruction: value,
  };
}

function inferKnowledgeUpdateRequest(text) {
  const value = String(text || '').trim();
  if (!value) return null;
  const mentionsKnowledge = /(知识库|企业资料|公司信息|品牌信息|补充资料)/.test(value);
  const asksMutation = /(更新|修改|补充|写入|记录|加入|新增|改成|修正)/.test(value);
  if (!mentionsKnowledge || !asksMutation) return null;
  return { instruction: value };
}

function contextUsagePayload(tokenUsage, modelId = '') {
  const total = Number(tokenUsage?.total || 0);
  const maxTokens = Number(tokenUsage?.maxTokens || 0);
  return {
    usedTokens: total,
    maxTokens,
    usagePercentage: Number(tokenUsage?.usagePercentage || (maxTokens ? Math.round((total / maxTokens) * 100) : 0)),
    modelId,
    inputTokens: total,
    outputTokens: 0,
    reasoningTokens: 0,
    cacheTokens: 0,
  };
}

function suggestionsFor({ intent, pendingAction = null, additionalResult = null, contextPack = null } = {}) {
  if (pendingAction) {
    return [
      { label: '查看待确认更新', value: pendingAction.title, actionType: 'propose_action', payload: pendingAction },
      { label: '查看当前知识库', value: '请查看当前企业知识库的完整内容。', actionType: 'send_message' },
      { label: '取消这次修改', value: '取消这次知识库修改。', actionType: 'send_message' },
    ];
  }
  if (intent === 'generate_additional_articles' || additionalResult) {
    return [
      { label: '再生成 1 篇排行榜稿', value: '再生成 1 篇排行榜稿', actionType: 'send_message' },
      { label: '生成 3 篇支撑稿', value: '再生成 3 篇支撑稿', actionType: 'send_message' },
      { label: '前往稿件管理校对', value: 'drafts', actionType: 'navigate', payload: { view: 'drafts' } },
    ];
  }
  if (contextPack?.draftState) {
    return [
      { label: '继续生成 1 篇稿件', value: '继续生成 1 篇完整文章', actionType: 'send_message' },
      { label: '查看最近稿件', value: '请列出最近生成的稿件标题和状态。', actionType: 'send_message' },
      { label: '前往稿件管理', value: 'drafts', actionType: 'navigate', payload: { view: 'drafts' } },
    ];
  }
  if (contextPack?.projectMemory) {
    return [
      { label: '分析 GEO 缺口', value: '基于当前企业知识库，分析豆包和 DeepSeek 的 GEO 缺口。', actionType: 'send_message' },
      { label: '生成关键词', value: '根据当前企业知识库生成目标关键词和长尾用户问题。', actionType: 'send_message' },
      { label: '生成知识库更新提案', value: '根据刚才的内容生成待确认知识库更新。', actionType: 'propose_action' },
    ];
  }
  return [
    { label: '建立企业知识库', value: '我想建立企业知识库，请引导我上传资料并生成草稿。', actionType: 'send_message' },
    { label: '了解录入要求', value: '请说明建立企业知识库需要准备哪些资料。', actionType: 'send_message' },
  ];
}

function makePendingKnowledgeAction({ projectId, conversationId, instruction }) {
  return {
    type: 'knowledge_update',
    title: '待确认知识库更新',
    summary: '这只是更新提案，确认前不会写入企业知识库。',
    payload: {
      projectId,
      conversationId,
      instruction,
    },
  };
}

async function runAdditionalArticles({ payload, conversation, projectId, contextPack, run, sender, channel }) {
  const request = inferAdditionalArticleRequest(payload.message);
  const platform = payload.platform || 'doubao';
  const stageMessage = conversationService.addMessage({
    conversationId: conversation.id,
    projectId,
    role: 'assistant',
    content: `正在继续生成 ${request.count} 篇完整稿件，生成后会保存到稿件管理。`,
    metadata: {
      type: 'geo_additional_articles',
      status: 'streaming',
      phase: 4,
      platform,
      request,
      run_id: run.id,
    },
  });
  sender.send(channel, {
    type: 'meta',
    conversation_id: conversation.id,
    message: stageMessage,
    platform,
    action: 'additional_articles',
    run_id: run.id,
    context_usage: contextUsagePayload(contextPack.tokenUsage, 'agent-runtime'),
    context_pack_summary: contextPack.summary,
  });
  traceService.addStep({
    runId: run.id,
    stepIndex: 2,
    stepType: 'tool_call',
    toolName: 'generate_additional_articles',
    status: 'running',
    title: '追加生成完整稿件',
    input: request,
  });
  const additionalResult = await articleDraftService.generateAdditionalArticlesStream(
    {
      geoProjectId: `geo-${projectId}`,
      platform,
      ...request,
    },
    (streamEvent) => sender.send(channel, streamEvent),
  );
  const content = additionalResult.status === 'completed'
    ? `已继续生成 ${additionalResult.total || request.count} 篇完整稿件，均已保存到稿件管理，可继续校对、预览和发布。`
    : `继续生成稿件失败：${additionalResult.error_message || '请稍后重试。'}`;
  const savedMessage = conversationService.updateConversationMessage({
    messageId: stageMessage.id,
    conversationId: conversation.id,
    projectId,
    content,
    metadata: {
      type: 'geo_additional_articles',
      status: additionalResult.status || 'completed',
      phase: 4,
      platform,
      request,
      additional_articles: additionalResult,
      confirmation_state: 'output-available',
      confirmation_approved: true,
      run_id: run.id,
    },
  });
  traceService.addStep({
    runId: run.id,
    stepIndex: 3,
    stepType: 'tool_result',
    toolName: 'generate_additional_articles',
    status: additionalResult.status === 'completed' ? 'completed' : 'failed',
    output: { total: additionalResult.total, status: additionalResult.status },
    artifactType: 'geo_article_drafts',
    artifactId: additionalResult.drafts?.[0]?.id || null,
    errorMessage: additionalResult.status === 'completed' ? null : additionalResult.error_message || 'failed',
  });
  traceService.updateRun(run.id, {
    status: additionalResult.status === 'completed' ? 'completed' : 'failed',
    artifact_type: 'geo_article_drafts',
    artifact_id: additionalResult.drafts?.[0]?.id || null,
    token_usage: contextPack.tokenUsage,
    error_message: additionalResult.status === 'completed' ? null : additionalResult.error_message || 'failed',
  });
  return {
    type: 'done',
    conversation_id: conversation.id,
    message: savedMessage,
    content,
    additional_articles: additionalResult,
    provider: '',
    model: '',
    error: additionalResult.status === 'completed' ? null : additionalResult.error_message || 'failed',
    sources: [],
    search_queries: [],
    search_actions: [],
    search_usage: {},
    run_id: run.id,
    context_usage: contextUsagePayload(contextPack.tokenUsage, 'agent-runtime'),
    context_pack_summary: contextPack.summary,
    suggestions: suggestionsFor({ intent: 'generate_additional_articles', additionalResult, contextPack }),
  };
}

async function runChatModel({ payload, conversation, projectId, contextPack, run, sender, channel }) {
  const policy = getTaskPolicy('rag_chat');
  let assistantContent = '';
  let provider = policy.provider || 'ark';
  let model = policy.model || process.env.DOUBAO_MODEL || process.env.ARK_MODEL || '';
  let reasoningContent = null;

  traceService.addStep({
    runId: run.id,
    stepIndex: 2,
    stepType: 'model_call',
    toolName: 'chat_with_context',
    status: 'running',
    title: '上下文对话',
    input: { context_summary: contextPack.summary },
  });

  await llmGateway.streamLLM({
    messages: contextPack.modelMessages,
    temperature: 0.7,
    maxTokens: 4000,
    taskType: 'agent_chat',
    provider,
    model,
    apiFamily: policy.api_family,
    networkMode: policy.network_mode,
    deepThinking: policy.deep_thinking,
    onEvent: (streamEvent) => {
      if (streamEvent.type === 'model_start' || streamEvent.type === 'model_status') {
        provider = streamEvent.provider || provider;
        model = streamEvent.model || model;
        sender.send(channel, {
          type: 'meta',
          conversation_id: conversation.id,
          provider,
          model,
          run_id: run.id,
          context_usage: contextUsagePayload(contextPack.tokenUsage, model || provider),
          context_pack_summary: contextPack.summary,
        });
      }
      if (streamEvent.type === 'status') {
        sender.send(channel, {
          type: 'status',
          message: streamEvent.message || '正在处理...',
          conversation_id: conversation.id,
          run_id: run.id,
        });
      }
      if (streamEvent.type === 'reasoning_delta' && streamEvent.text) {
        reasoningContent = (reasoningContent || '') + streamEvent.text;
        sender.send(channel, { type: 'reasoning_delta', text: streamEvent.text, run_id: run.id });
      }
      if (streamEvent.type === 'delta' && streamEvent.text) {
        assistantContent += streamEvent.text;
        sender.send(channel, { type: 'delta', text: streamEvent.text, run_id: run.id });
      }
    },
  });

  conversationService.addMessage({
    conversationId: conversation.id,
    projectId,
    role: 'assistant',
    content: assistantContent,
    metadata: {
      type: 'chat_response',
      provider,
      model,
      status: 'complete',
      context_usage: contextUsagePayload(contextPack.tokenUsage, model || provider),
      context_pack_summary: contextPack.summary,
      run_id: run.id,
    },
  });
  traceService.addStep({
    runId: run.id,
    stepIndex: 3,
    stepType: 'model_result',
    toolName: 'chat_with_context',
    status: 'completed',
    output: { content_length: assistantContent.length },
  });
  traceService.updateRun(run.id, {
    status: 'completed',
    provider,
    model,
    network_mode: policy.network_mode,
    token_usage: contextPack.tokenUsage,
  });

  return {
    type: 'done',
    conversation_id: conversation.id,
    provider,
    model,
    content: assistantContent,
    error: null,
    sources: [],
    search_queries: [],
    search_actions: [],
    search_usage: {},
    reasoning_content: reasoningContent,
    run_id: run.id,
    context_usage: contextUsagePayload(contextPack.tokenUsage, model || provider),
    context_pack_summary: contextPack.summary,
    suggestions: suggestionsFor({ intent: 'chat', contextPack }),
  };
}

async function runKnowledgeUpdateProposal({ request, conversation, projectId, contextPack, run }) {
  const pendingAction = makePendingKnowledgeAction({
    projectId,
    conversationId: conversation.id,
    instruction: request.instruction,
  });
  const content = [
    '我已生成一个待确认的知识库更新动作。',
    '',
    '确认前不会写入企业知识库；请先核对影响范围，再决定是否应用。',
  ].join('\n');
  const savedMessage = conversationService.addMessage({
    conversationId: conversation.id,
    projectId,
    role: 'assistant',
    content,
    metadata: {
      type: 'agent_pending_action',
      status: 'pending',
      pending_action: pendingAction,
      confirmation_state: 'approval-requested',
      run_id: run.id,
    },
  });
  traceService.addStep({
    runId: run.id,
    stepIndex: 2,
    stepType: 'approval_request',
    toolName: 'propose_knowledge_update',
    status: 'completed',
    input: pendingAction.payload,
  });
  traceService.updateRun(run.id, {
    status: 'completed',
    artifact_type: 'pending_action',
    artifact_id: savedMessage.id,
    token_usage: contextPack.tokenUsage,
  });
  return {
    type: 'done',
    conversation_id: conversation.id,
    message: savedMessage,
    content,
    provider: 'local',
    model: 'agent-runtime',
    error: null,
    sources: [],
    search_queries: [],
    search_actions: [],
    search_usage: {},
    reasoning_content: null,
    pending_action: pendingAction,
    run_id: run.id,
    context_usage: contextUsagePayload(contextPack.tokenUsage, 'agent-runtime'),
    context_pack_summary: contextPack.summary,
    suggestions: suggestionsFor({ pendingAction, contextPack }),
  };
}

async function runChatStream({ payload = {}, sender, channel }) {
  const projectId = payload.project_id || payload.projectId || null;
  const conversation = conversationService.ensureConversation({
    projectId,
    conversationId: payload.conversation_id || null,
    firstMessage: payload.message,
  });
  conversationService.addMessage({
    conversationId: conversation.id,
    projectId,
    role: 'user',
    content: payload.message || '',
    metadata: { type: 'chat_user' },
  });

  const additionalArticleRequest = inferAdditionalArticleRequest(payload.message);
  const knowledgeUpdateRequest = inferKnowledgeUpdateRequest(payload.message);
  const intent = additionalArticleRequest && projectId
    ? 'generate_additional_articles'
    : knowledgeUpdateRequest && projectId
      ? 'propose_knowledge_update'
      : 'chat';
  const run = traceService.createRun({ conversationId: conversation.id, projectId, intent });
  const contextPack = await contextWindowService.buildContextPack(
    conversation.id,
    projectId,
    { maxTokens: 100000, recentMessageCount: 8 }
  );

  traceService.addStep({
    runId: run.id,
    stepIndex: 1,
    stepType: 'context_pack',
    status: 'completed',
    title: contextPack.summary,
    output: { summary: contextPack.summary, token_usage: contextPack.tokenUsage },
  });

  try {
    if (additionalArticleRequest && !projectId) {
      const content = '继续生成稿件需要先选择一个企业知识库项目。';
      const savedMessage = conversationService.addMessage({
        conversationId: conversation.id,
        projectId,
        role: 'assistant',
        content,
        metadata: { type: 'chat_response', status: 'complete', run_id: run.id },
      });
      traceService.updateRun(run.id, { status: 'completed', token_usage: contextPack.tokenUsage });
      return {
        type: 'done',
        conversation_id: conversation.id,
        message: savedMessage,
        content,
        provider: 'local',
        model: 'agent-runtime',
        error: null,
        run_id: run.id,
        context_usage: contextUsagePayload(contextPack.tokenUsage, 'agent-runtime'),
        context_pack_summary: contextPack.summary,
        suggestions: suggestionsFor({ contextPack }),
      };
    }
    if (intent === 'generate_additional_articles') {
      return runAdditionalArticles({ payload, conversation, projectId, contextPack, run, sender, channel });
    }
    if (intent === 'propose_knowledge_update') {
      return runKnowledgeUpdateProposal({ request: knowledgeUpdateRequest, conversation, projectId, contextPack, run });
    }
    return runChatModel({ payload, conversation, projectId, contextPack, run, sender, channel });
  } catch (error) {
    traceService.updateRun(run.id, {
      status: 'failed',
      token_usage: contextPack.tokenUsage,
      error_message: error.message || String(error),
    });
    throw error;
  }
}

function listTools() {
  return TOOL_REGISTRY.map((tool) => ({ ...tool }));
}

module.exports = {
  MAX_ADDITIONAL_ARTICLES,
  inferAdditionalArticleRequest,
  inferKnowledgeUpdateRequest,
  listTools,
  runChatStream,
  suggestionsFor,
};
