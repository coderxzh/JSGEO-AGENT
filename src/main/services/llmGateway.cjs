const { NETWORK_MODES } = require('./modelPolicyService.cjs');

function cleanBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function firstConfiguredProvider() {
  if (process.env.ARK_API_KEY) return 'ark';
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return process.env.GEO_EXTRACTION_PROVIDER || 'ark';
}

function getProviderConfig(providerName = null, modelOverride = null) {
  const provider = providerName || firstConfiguredProvider();

  if (provider === 'ark') {
    return {
      provider,
      apiKey: process.env.ARK_API_KEY,
      baseUrl: cleanBaseUrl(process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'),
      model: modelOverride || process.env.GEO_EXTRACTION_MODEL || process.env.ARK_MODEL || process.env.DOUBAO_MODEL,
    };
  }

  if (provider === 'deepseek') {
    return {
      provider,
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: cleanBaseUrl(process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'),
      model: modelOverride || process.env.GEO_EXTRACTION_MODEL || process.env.DEEPSEEK_MODEL,
    };
  }

  if (provider === 'openai') {
    return {
      provider,
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: cleanBaseUrl(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'),
      model: modelOverride || process.env.GEO_EXTRACTION_MODEL || process.env.OPENAI_MODEL,
    };
  }

  throw new Error(`不支持的模型提供商：${provider}`);
}

function getExtractionConfig() {
  return getProviderConfig(process.env.GEO_EXTRACTION_PROVIDER || null, process.env.GEO_EXTRACTION_MODEL || null);
}

function shouldUseChatResponseFormat(provider, model) {
  const configured = String(process.env.GEO_EXTRACTION_RESPONSE_FORMAT || '').trim().toLowerCase();
  if (configured === 'json_object') return true;
  if (['none', 'off', 'false'].includes(configured)) return false;
  if (provider === 'ark' || /doubao|seed/i.test(String(model || ''))) return false;
  return provider === 'openai' || provider === 'deepseek';
}

function stripJsonCodeFence(content) {
  const text = String(content || '').trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : text;
}

function parseJsonContent(content) {
  const stripped = stripJsonCodeFence(content);
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1));
    }
    throw new Error('模型没有返回有效 JSON。');
  }
}

function createRequestId(prefix = 'llm') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function sanitizeError(error) {
  return String(error?.message || error || '')
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer ***')
    .replace(/(api[_-]?key["']?\s*[:=]\s*["']?)[^"',\s]+/gi, '$1***');
}

function chatDeltaFromEvent(event) {
  const choice = Array.isArray(event?.choices) ? event.choices[0] : null;
  return choice?.delta?.content
    || choice?.delta?.reasoning_content
    || choice?.delta?.reasoning
    || event.delta
    || event.text
    || '';
}

function chatReasoningDeltaFromEvent(event) {
  const choice = Array.isArray(event?.choices) ? event.choices[0] : null;
  return choice?.delta?.reasoning_content || choice?.delta?.reasoning || '';
}

async function chatCompletion({
  messages,
  temperature = 0.1,
  maxTokens = 6000,
  provider = null,
  model = null,
  forceNoResponseFormat = false,
}) {
  const config = getProviderConfig(provider, model);
  if (!config.apiKey) throw new Error('未配置模型 API Key。');
  if (!config.model) throw new Error('未配置模型 ID。');

  const requestBody = {
    model: config.model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (!forceNoResponseFormat && shouldUseChatResponseFormat(config.provider, config.model)) {
    requestBody.response_format = { type: 'json_object' };
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const responseFormatRejected = response.status === 400 && /response_format|json_object/i.test(body);
    if (requestBody.response_format && responseFormatRejected) {
      return chatCompletion({
        messages,
        temperature,
        maxTokens,
        provider: config.provider,
        model: config.model,
        forceNoResponseFormat: true,
      });
    }
    throw new Error(`模型调用失败：HTTP ${response.status}${body ? ` ${body.slice(0, 300)}` : ''}`);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  if (!content) throw new Error('模型没有返回内容。');

  return {
    provider: config.provider,
    model: config.model,
    content,
  };
}

async function chatCompletionStream({
  messages,
  temperature = 0.1,
  maxTokens = 6000,
  provider = null,
  model = null,
  forceNoResponseFormat = false,
  taskType = 'chat_completion',
  onEvent = null,
}) {
  const config = getProviderConfig(provider, model);
  if (!config.apiKey) throw new Error('未配置模型 API Key。');
  if (!config.model) throw new Error('未配置模型 ID。');

  const requestId = createRequestId(taskType);
  const startedAt = Date.now();
  const requestBody = {
    model: config.model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };
  if (!forceNoResponseFormat && shouldUseChatResponseFormat(config.provider, config.model)) {
    requestBody.response_format = { type: 'json_object' };
  }

  onEvent?.({
    type: 'model_start',
    task_type: taskType,
    provider: config.provider,
    model: config.model,
    api_family: 'chat_completions',
    request_id: requestId,
    message: '模型请求已发起',
    can_proceed: false,
  });

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  onEvent?.({
    type: 'model_status',
    task_type: taskType,
    provider: config.provider,
    model: config.model,
    api_family: 'chat_completions',
    request_id: requestId,
    http_status: response.status,
    latency_ms: Date.now() - startedAt,
    message: response.ok ? '模型已开始流式返回' : '模型请求返回错误',
    can_proceed: false,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const responseFormatRejected = response.status === 400 && /response_format|json_object/i.test(body);
    if (requestBody.response_format && responseFormatRejected) {
      onEvent?.({
        type: 'model_status',
        task_type: taskType,
        provider: config.provider,
        model: config.model,
        api_family: 'chat_completions',
        request_id: requestId,
        http_status: response.status,
        message: '当前模型不支持 response_format，已自动切换为普通 JSON 提示重试',
        can_proceed: false,
      });
      return chatCompletionStream({
        messages,
        temperature,
        maxTokens,
        provider: config.provider,
        model: config.model,
        forceNoResponseFormat: true,
        taskType,
        onEvent,
      });
    }
    const errorMessage = `模型流式调用失败：HTTP ${response.status}${body ? ` ${body.slice(0, 300)}` : ''}`;
    onEvent?.({
      type: 'model_status',
      task_type: taskType,
      provider: config.provider,
      model: config.model,
      api_family: 'chat_completions',
      request_id: requestId,
      http_status: response.status,
      error: sanitizeError(errorMessage),
      message: '模型请求失败',
      can_proceed: false,
    });
    throw new Error(errorMessage);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let reasoningContent = '';

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const parsed = parseSseLines(buffer);
    buffer = parsed.rest;
    parsed.events.forEach((event) => {
      const reasoningDelta = String(chatReasoningDeltaFromEvent(event) || '');
      const delta = String(chatDeltaFromEvent(event) || '');
      if (reasoningDelta) {
        reasoningContent += reasoningDelta;
        onEvent?.({
          type: 'reasoning_delta',
          task_type: taskType,
          provider: config.provider,
          model: config.model,
          api_family: 'chat_completions',
          request_id: requestId,
          text: reasoningDelta,
          can_proceed: false,
        });
        return;
      }
      if (delta) {
        content += delta;
        onEvent?.({
          type: 'delta',
          task_type: taskType,
          provider: config.provider,
          model: config.model,
          api_family: 'chat_completions',
          request_id: requestId,
          text: delta,
          can_proceed: false,
        });
      }
    });
  }

  onEvent?.({
    type: 'model_status',
    task_type: taskType,
    provider: config.provider,
    model: config.model,
    api_family: 'chat_completions',
    request_id: requestId,
    latency_ms: Date.now() - startedAt,
    message: '模型流式返回完成，正在校验结构化结果',
    can_proceed: false,
  });

  if (!content) throw new Error('模型没有返回内容。');
  return {
    provider: config.provider,
    model: config.model,
    request_id: requestId,
    content,
    reasoning_content: reasoningContent || null,
  };
}

async function chatJson(options) {
  const completion = await chatCompletion(options);
  return {
    provider: completion.provider,
    model: completion.model,
    json: parseJsonContent(completion.content),
  };
}

function messagesToResponsesInput(messages = []) {
  return messages.map((message) => ({
    role: message.role === 'system' ? 'developer' : message.role,
    content: [
      {
        type: 'input_text',
        text: String(message.content || ''),
      },
    ],
  }));
}

function extractResponseText(result) {
  if (typeof result?.output_text === 'string' && result.output_text.trim()) {
    return result.output_text;
  }
  const output = Array.isArray(result?.output) ? result.output : [];
  const texts = [];
  output.forEach((item) => {
    const content = Array.isArray(item?.content) ? item.content : [];
    content.forEach((part) => {
      if (typeof part?.text === 'string') texts.push(part.text);
      if (typeof part?.output_text === 'string') texts.push(part.output_text);
    });
  });
  return texts.join('\n').trim();
}

function applyNetworkTool(body, networkMode) {
  if (networkMode === NETWORK_MODES.WEB_SEARCH_PLUGIN) {
    body.tools = [{
      type: 'web_search',
      max_keyword: Number(process.env.ARK_WEB_SEARCH_MAX_KEYWORD || 2),
      limit: Number(process.env.ARK_WEB_SEARCH_LIMIT || 10),
    }];
    body.max_tool_calls = Number(process.env.ARK_WEB_SEARCH_MAX_TOOL_CALLS || 3);
  }
  if (networkMode === NETWORK_MODES.DOUBAO_ASSISTANT_SEARCH) {
    body.tools = [{
      type: 'doubao_app',
      feature: {
        ai_search: {
          type: 'enabled',
          role_description: '你是 GEO 信源研究助手，优先寻找目标 AI 更可能引用的公开平台、网站、文章类型和证据结构。',
        },
        reasoning_search: {
          type: 'enabled',
        },
      },
    }];
  }
}

function buildResponsesHeaders(config, networkMode) {
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  };

  if (networkMode === NETWORK_MODES.DOUBAO_ASSISTANT_SEARCH) {
    headers['ark-beta-doubao-app'] = 'true';
  }

  return headers;
}

async function responsesCompletion({
  messages,
  input = null,
  temperature = 0.2,
  maxTokens = 6000,
  provider = 'ark',
  model = null,
  webSearch = false,
  networkMode = NETWORK_MODES.NONE,
  deepThinking = false,
  stream = false,
} = {}) {
  const config = getProviderConfig(provider, model);
  if (!config.apiKey) throw new Error('未配置豆包 Responses API Key。');
  if (!config.model) throw new Error('未配置豆包 Responses 模型 ID。');

  const resolvedNetworkMode = webSearch ? NETWORK_MODES.WEB_SEARCH_PLUGIN : networkMode;
  const body = {
    model: config.model,
    input: input || messagesToResponsesInput(messages),
    temperature,
    max_output_tokens: maxTokens,
    stream,
  };
  applyNetworkTool(body, resolvedNetworkMode);
  if (deepThinking) {
    body.reasoning = { effort: process.env.DOUBAO_REASONING_EFFORT || 'high' };
  }

  const response = await fetch(`${config.baseUrl}/responses`, {
    method: 'POST',
    headers: buildResponsesHeaders(config, resolvedNetworkMode),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`豆包 Responses API 调用失败：HTTP ${response.status}${text ? ` ${text.slice(0, 300)}` : ''}`);
  }

  return {
    provider: config.provider,
    model: config.model,
    network_mode: resolvedNetworkMode,
    result: await response.json(),
  };
}

function parseSseLines(buffer) {
  const events = [];
  const parts = buffer.split(/\r?\n\r?\n/);
  const rest = parts.pop() || '';
  parts.forEach((part) => {
    const data = part
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n');
    if (!data || data === '[DONE]') return;
    try {
      events.push(JSON.parse(data));
    } catch {
      events.push({ type: 'raw', data });
    }
  });
  return { events, rest };
}

function textDeltaFromEvent(event) {
  return event.delta
    || event.text
    || event.output_text
    || event?.response?.output_text
    || '';
}

function isReasoningEvent(event) {
  return /reason/i.test(String(event.type || event.event || ''));
}

async function responsesStream({
  messages,
  input = null,
  temperature = 0.2,
  maxTokens = 6000,
  provider = 'ark',
  model = null,
  webSearch = false,
  networkMode = NETWORK_MODES.NONE,
  deepThinking = false,
  onEvent = null,
} = {}) {
  const config = getProviderConfig(provider, model);
  if (!config.apiKey) throw new Error('未配置豆包 Responses API Key。');
  if (!config.model) throw new Error('未配置豆包 Responses 模型 ID。');

  const resolvedNetworkMode = webSearch ? NETWORK_MODES.WEB_SEARCH_PLUGIN : networkMode;
  const body = {
    model: config.model,
    input: input || messagesToResponsesInput(messages),
    temperature,
    max_output_tokens: maxTokens,
    stream: true,
  };
  applyNetworkTool(body, resolvedNetworkMode);
  if (deepThinking) {
    body.reasoning = { effort: process.env.DOUBAO_REASONING_EFFORT || 'high' };
  }

  const response = await fetch(`${config.baseUrl}/responses`, {
    method: 'POST',
    headers: buildResponsesHeaders(config, resolvedNetworkMode),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`豆包 Responses API 流式调用失败：HTTP ${response.status}${text ? ` ${text.slice(0, 300)}` : ''}`);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let outputText = '';
  let reasoningText = '';
  let finalResponse = null;

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const parsed = parseSseLines(buffer);
    buffer = parsed.rest;
    parsed.events.forEach((event) => {
      if (event.type === 'response.completed' || event.response) {
        finalResponse = event.response || finalResponse;
      }
      const delta = String(textDeltaFromEvent(event) || '');
      if (!delta) return;
      if (isReasoningEvent(event)) {
        reasoningText += delta;
        onEvent?.({ type: 'reasoning_delta', text: delta, event });
      } else {
        outputText += delta;
        onEvent?.({ type: 'delta', text: delta, event });
      }
    });
  }

  return {
    provider: config.provider,
    model: config.model,
    network_mode: resolvedNetworkMode,
    content: outputText || extractResponseText(finalResponse),
    reasoning_content: reasoningText || null,
    raw: finalResponse,
  };
}

async function responsesJson(options) {
  const completion = await responsesCompletion(options);
  const content = extractResponseText(completion.result);
  if (!content) throw new Error('豆包 Responses API 没有返回可解析文本。');
  return {
    provider: completion.provider,
    model: completion.model,
    network_mode: completion.network_mode,
    json: parseJsonContent(content),
    raw: completion.result,
  };
}

module.exports = {
  chatCompletion,
  chatCompletionStream,
  chatJson,
  getExtractionConfig,
  parseJsonContent,
  responsesCompletion,
  responsesJson,
  responsesStream,
};
