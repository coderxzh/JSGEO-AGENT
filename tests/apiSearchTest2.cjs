/**
 * 测试超级媒介搜索接口 /media-resource/search
 */
const crypto = require('crypto');

const APPID = '01KSHY9MG6DKG0RC17QFZ7NN8J';
const SECRET = 'OTgv5EXvGh6rQ423F7saWliB7ih7esSD';

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

async function testUrl(url, label) {
  console.log(`\n── ${label} ──`);
  console.log(`URL: ${url}`);
  try {
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    });
    console.log(`Status: ${resp.status}`);
    console.log(`Content-Type: ${resp.headers.get('content-type')}`);
    const text = await resp.text();
    if (text.startsWith('{') || text.startsWith('[')) {
      const json = JSON.parse(text);
      console.log(`Total: ${json.total}`);
      console.log(`Items: ${json.items?.length}`);
      if (json.items?.length > 0) {
        console.log(`First: ${json.items[0].name} (ID:${json.items[0].id})`);
      }
    } else {
      console.log(`Response (前200字符): ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
}

async function main() {
  console.log('=== 搜索接口测试 ===');

  const searchUrl = 'https://vip.chaojimeijie.com/media-resource/search';
  const params = new URLSearchParams({ page_size: '20', name: '食品' });

  // 测试1: 无认证
  await testUrl(`${searchUrl}?${params}`, '无认证');

  // 测试2: 带认证参数
  const authParams = withAuth({ page_size: 20, name: '食品' });
  await testUrl(`${searchUrl}?${encodeQuery(authParams)}`, '带认证参数');

  // 测试3: 带 Cookie（模拟浏览器）
  console.log('\n── 提示: 这个接口可能是 Web 后台的接口，需要浏览器登录态 ──');
  console.log('你的浏览器抓包里有 Cookie 吗？');
}

main().catch(console.error);
