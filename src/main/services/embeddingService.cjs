const { fetchWithRetry, sanitizeErrorMessage } = require('./apiClient.cjs');

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function embeddingConfig() {
  // 优先读取 ARK_EMBEDDING_* 配置（豆包多模态 API），回退到 OPENAI_EMBEDDING_*
  const model = process.env.ARK_EMBEDDING_MODEL || process.env.OPENAI_EMBEDDING_MODEL || '';
  const apiKey = process.env.ARK_EMBEDDING_API_KEY || process.env.ARK_API_KEY || process.env.OPENAI_EMBEDDING_API_KEY || '';
  const baseUrl = normalizeBaseUrl(
    process.env.ARK_EMBEDDING_BASE_URL
      || process.env.ARK_BASE_URL
      || process.env.OPENAI_EMBEDDING_BASE_URL
      || 'https://ark.cn-beijing.volces.com/api/v3'
  );
  const dimensions = Number(process.env.ARK_EMBEDDING_DIMENSIONS || process.env.OPENAI_EMBEDDING_DIMENSIONS || 0);
  const concurrency = Math.max(1, Number(process.env.ARK_EMBEDDING_CONCURRENCY || process.env.OPENAI_EMBEDDING_CONCURRENCY || 2));

  return {
    apiKey,
    baseUrl,
    concurrency,
    dimensions: Number.isFinite(dimensions) ? dimensions : 0,
    model,
  };
}

function isEmbeddingEnabled() {
  const config = embeddingConfig();
  return Boolean(config.apiKey && config.model);
}

async function embedBatch(texts = []) {
  const config = embeddingConfig();
  if (!config.apiKey || !config.model) {
    throw new Error('Embedding is not configured.');
  }

  // 豆包多模态 API 每次只处理一个文本，需要逐个请求
  const results = [];
  for (const text of texts) {
    const input = [{ type: 'text', text: String(text || '') }];
    const response = await fetchWithRetry(`${config.baseUrl}/embeddings/multimodal`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        encoding_format: 'float',
        input,
      }),
    }, {
      timeout: 30000,
      maxRetries: 2,
    });

    const responseText = await response.text().catch(() => '');
    console.log('[Embedding] 响应状态:', response.status);

    if (!response.ok) {
      throw new Error(`Embedding request failed: ${response.status} ${sanitizeErrorMessage(responseText.slice(0, 300))}`);
    }

    const data = JSON.parse(responseText);

    // 豆包多模态 API 返回格式：{ data: { embedding: [...] } }
    if (data?.data?.embedding && Array.isArray(data.data.embedding)) {
      results.push(data.data.embedding);
    }
  }
  return results;
}

async function embedTexts(texts = []) {
  const config = embeddingConfig();
  const cleanTexts = texts.map((text) => String(text || '').trim());
  const batches = [];
  for (let index = 0; index < cleanTexts.length; index += config.concurrency) {
    batches.push(cleanTexts.slice(index, index + config.concurrency));
  }

  const result = [];
  for (const batch of batches) {
    result.push(...await embedBatch(batch));
  }
  return result;
}

module.exports = {
  embedTexts,
  embeddingConfig,
  isEmbeddingEnabled,
};
