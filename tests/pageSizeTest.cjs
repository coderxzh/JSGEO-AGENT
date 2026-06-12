/**
 * 测试超级媒介 API 的 page size 上限
 */
const crypto = require('crypto');

const APPID = '01KSHY9MG6DKG0RC17QFZ7NN8J';
const SECRET = 'OTgv5EXvGh6rQ423F7saWliB7ih7esSD';
const BASE_URL = 'https://vip.chaojimeijie.com/api';

function flattenPayload(value) {
  if (Array.isArray(value)) {
    return [...value].sort((a, b) => String(a).localeCompare(String(b)))
      .map((item) => (item && typeof item === 'object' ? flattenPayload(item) : String(item ?? ''))).join('');
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).filter((key) => key !== 'signature' && value[key] != null && value[key] !== '')
      .sort().map((key) => {
        const item = value[key];
        return `${key}=${item && typeof item === 'object' ? flattenPayload(item) : String(item ?? '')}`;
      }).join('');
  }
  return String(value ?? '');
}

function withAuth(params = {}) {
  const payload = { appid: APPID, timestamp: Math.floor(Date.now() / 1000), algorithm: 'sha256', ...params };
  payload.signature = crypto.createHmac('sha256', SECRET).update(flattenPayload(payload)).digest('hex');
  return payload;
}

function encodeQuery(params) {
  const parts = [];
  Object.entries(params).filter(([, v]) => v !== undefined && v !== null).forEach(([key, value]) => {
    const encodedKey = encodeURIComponent(key).replace(/%5B%5D/g, '[]');
    if (Array.isArray(value)) {
      value.forEach((item) => parts.push(`${encodedKey}[]=${encodeURIComponent(String(item ?? ''))}`));
    } else {
      parts.push(`${encodedKey}=${encodeURIComponent(String(value ?? ''))}`);
    }
  });
  return parts.join('&');
}

async function testSize(size) {
  const params = withAuth({ page: 1, size });
  const url = `${BASE_URL}/media/resource?${encodeQuery(params)}`;
  const start = Date.now();
  try {
    const resp = await fetch(url);
    const json = await resp.json();
    const elapsed = Date.now() - start;
    if (Number(json.code) === 200) {
      const items = json.data?.items || [];
      console.log(`size=${String(size).padStart(5)} → ${String(items.length).padStart(5)} 条返回, total=${json.data?.total}, ${elapsed}ms`);
      return { size, returned: items.length, total: json.data?.total, ok: true };
    } else {
      console.log(`size=${String(size).padStart(5)} → 错误: ${json.code} ${json.message}, ${elapsed}ms`);
      return { size, ok: false, error: json.message };
    }
  } catch (err) {
    console.log(`size=${String(size).padStart(5)} → 异常: ${err.message}`);
    return { size, ok: false, error: err.message };
  }
}

async function main() {
  console.log('=== 测试 API page size 上限 ===\n');

  const sizes = [20, 50, 100, 200, 300, 500, 1000, 2000, 5000, 10000, 14785];
  for (const size of sizes) {
    await testSize(size);
  }
}

main().catch(console.error);
