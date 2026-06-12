/**
 * 测试直接调用超级媒介 API 搜索资源（不使用本地数据库）
 */
const crypto = require('crypto');

// ─── 配置 ───
const APPID = '01KSHY9MG6DKG0RC17QFZ7NN8J';
const SECRET = 'OTgv5EXvGh6rQ423F7saWliB7ih7esSD';
const BASE_URL = 'https://vip.chaojimeijie.com/api';

// ─── 签名（与 chaojimeijieService.cjs 保持一致） ───
function flattenPayload(value) {
  if (Array.isArray(value)) {
    return [...value]
      .sort((a, b) => String(a).localeCompare(String(b)))
      .map((item) => (item && typeof item === 'object' ? flattenPayload(item) : String(item ?? '')))
      .join('');
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .filter((key) => key !== 'signature' && value[key] != null && value[key] !== '')
      .sort()
      .map((key) => {
        const item = value[key];
        const nextValue = item && typeof item === 'object' ? flattenPayload(item) : String(item ?? '');
        return `${key}=${nextValue}`;
      })
      .join('');
  }
  return String(value ?? '');
}

function signPayload(payload, secret) {
  const stringToSign = flattenPayload(payload);
  console.log('[签名]', stringToSign.slice(0, 120) + '...');
  return crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');
}

function withAuth(params = {}) {
  const payload = {
    appid: APPID,
    timestamp: Math.floor(Date.now() / 1000),
    algorithm: 'sha256',
    ...params,
  };
  payload.signature = signPayload(payload, SECRET);
  return payload;
}

function encodeQuery(params) {
  const parts = [];
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .forEach(([key, value]) => {
      const encodedKey = encodeURIComponent(key).replace(/%5B%5D/g, '[]');
      if (Array.isArray(value)) {
        value.forEach((item) => parts.push(`${encodedKey}[]=${encodeURIComponent(String(item ?? ''))}`));
      } else {
        parts.push(`${encodedKey}=${encodeURIComponent(String(value ?? ''))}`);
      }
    });
  return parts.join('&');
}

// ─── API 调用 ───
async function fetchResources(resourceType, page = 1, size = 200) {
  const endpoint = resourceType === 'we-media' ? '/we-media/resource' : '/media/resource';
  const payload = withAuth({ page, size });
  const url = new URL(`${BASE_URL}${endpoint}`);
  const query = encodeQuery(payload);
  if (query) url.search = query;

  const response = await fetch(url.toString());
  const json = await response.json();

  if (Number(json.code) !== 200) {
    throw new Error(`API 错误: ${json.code} ${json.message}`);
  }
  return json.data;
}

// ─── 主测试 ───
async function main() {
  console.log('=== 测试直接调用超级媒介 API ===\n');

  // 1. 获取新闻媒体资源（第1页）
  console.log('── 1. 获取新闻媒体资源 ──');
  const mediaData = await fetchResources('media', 1, 200);
  console.log(`总数: ${mediaData.total}, 本页: ${mediaData.items.length} 条\n`);

  // 2. 分页获取全部
  console.log('── 2. 分页获取全部资源 ──');
  const allMedia = [];
  const pageSize = 200;
  const totalPages = Math.ceil(mediaData.total / pageSize);
  for (let page = 1; page <= totalPages; page++) {
    const data = await fetchResources('media', page, pageSize);
    allMedia.push(...data.items);
    console.log(`  新闻媒体 第${page}/${totalPages}页: 累计 ${allMedia.length}`);
  }

  const weMediaData = await fetchResources('we-media', 1, 200);
  console.log(`\n自媒体总数: ${weMediaData.total}`);
  const allWeMedia = [];
  const weMediaPages = Math.ceil(weMediaData.total / pageSize);
  for (let page = 1; page <= weMediaPages; page++) {
    const data = await fetchResources('we-media', page, pageSize);
    allWeMedia.push(...data.items);
    console.log(`  自媒体 第${page}/${weMediaPages}页: 累计 ${allWeMedia.length}`);
  }

  const allResources = [...allMedia, ...allWeMedia];
  console.log(`\n全部资源: ${allResources.length} 条`);

  // 3. 搜索 "食品"
  console.log('\n── 3. 搜索 "食品" ──');
  const nameMatches = allResources.filter((r) => r.name && r.name.includes('食品'));
  const remarkMatches = allResources.filter((r) => r.remark && r.remark.includes('食品'));
  const allMatches = allResources.filter(
    (r) => (r.name && r.name.includes('食品')) || (r.remark && r.remark.includes('食品'))
  );

  console.log(`名称含"食品": ${nameMatches.length} 条`);
  console.log(`备注含"食品": ${remarkMatches.length} 条`);
  console.log(`名称或备注含"食品": ${allMatches.length} 条\n`);

  console.log('前30条:');
  for (const r of allMatches.slice(0, 30)) {
    console.log(`  ${r.name} (ID:${r.id}, ¥${r.price}, status:${r.status})`);
  }

  // 4. 对比本地数据库
  console.log('\n── 4. 对比本地数据库 ──');
  try {
    const Database = require('better-sqlite3');
    const path = require('path');
    const os = require('os');
    const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'geo-agent-studio', 'geo-agent-studio.sqlite3');
    const db = new Database(dbPath);

    const dbAll = db.prepare("SELECT resource_id, name FROM publish_resources WHERE provider = 'chaojimeijie'").all();
    const dbIds = new Set(dbAll.map((r) => Number(r.resource_id)));
    console.log(`本地数据库: ${dbAll.length} 条`);

    const dbFood = db.prepare(
      "SELECT resource_id, name FROM publish_resources WHERE provider = 'chaojimeijie' AND (name LIKE '%食品%' OR raw_json LIKE '%食品%')"
    ).all();
    console.log(`本地"食品": ${dbFood.length} 条`);

    const apiOnly = allMatches.filter((r) => !dbIds.has(r.id));
    console.log(`\nAPI有但本地没有: ${apiOnly.length} 条`);
    for (const r of apiOnly) {
      console.log(`  ${r.name} (ID:${r.id}, ¥${r.price})`);
    }

    db.close();
  } catch (err) {
    console.log(`数据库对比失败: ${err.message}`);
  }
}

main().catch(console.error);
