/**
 * 测试不传 size 参数时 API 的行为
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

async function test(label, params) {
  const query = encodeQuery(withAuth(params));
  const url = `${BASE_URL}/media/resource?${query}`;
  console.log(`\n── ${label} ──`);
  console.log(`参数: ${JSON.stringify(params)}`);
  const start = Date.now();
  const resp = await fetch(url);
  const json = await resp.json();
  const elapsed = Date.now() - start;
  const items = json.data?.items || [];
  console.log(`返回: ${items.length} 条, total: ${json.data?.total}, 耗时: ${elapsed}ms`);
  if (items.length > 0) {
    console.log(`第一条: ${items[0].name} (ID:${items[0].id})`);
    console.log(`最后一条: ${items[items.length - 1].name} (ID:${items[items.length - 1].id})`);
  }
  return items.length;
}

async function main() {
  console.log('=== 测试不传 size 参数 ===');

  // 不传 size
  await test('不传 size', { page: 1 });

  // 传 size=200 对比
  await test('size=200', { page: 1, size: 200 });

  // 不传 page 和 size
  await test('不传 page 和 size', {});
}

main().catch(console.error);
