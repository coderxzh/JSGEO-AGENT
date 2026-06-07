const test = require('node:test');
const assert = require('node:assert/strict');

const { diffProfiles, applyDiffDecisions } = require('../src/main/services/profileDiffService.cjs');

function evidence(value, sourceQuote = null, confidence = 0.85) {
  return { value, source_quote: sourceQuote, confidence };
}

test('diffProfiles 标量字段缺失时归入 additions', () => {
  const existing = {
    company_name: evidence('行乐音改'),
  };
  const draft = {
    company_name: evidence('行乐音改'),
    detailed_address: evidence('成都市武侯区一环路南三段12号', '资料里写：地址：成都市武侯区一环路南三段12号', 0.9),
  };

  const { additions, conflicts, arrayMerges, unchanged } = diffProfiles(existing, draft);

  assert.equal(additions.length, 1);
  assert.equal(additions[0].key, 'detailed_address');
  assert.equal(additions[0].newValue, '成都市武侯区一环路南三段12号');
  assert.equal(additions[0].isArray, false);
  assert.equal(additions[0].sourceQuote, '资料里写：地址：成都市武侯区一环路南三段12号');
  assert.equal(conflicts.length, 0);
  assert.equal(arrayMerges.length, 0);
  assert.ok(unchanged.includes('company_name'));
});

test('diffProfiles 数组字段以 normalizeText 去重合并', () => {
  const existing = {
    offerings: evidence(['无损音响升级', '双层门板隔音']),
  };
  const draft = {
    offerings: evidence(['双层门板隔音 ', 'DSP电脑调音'], '业务范围：无损音响升级、双层门板隔音、DSP电脑调音'),
  };

  const { additions, arrayMerges, conflicts } = diffProfiles(existing, draft);

  assert.equal(additions.length, 0);
  assert.equal(conflicts.length, 0);
  assert.equal(arrayMerges.length, 1);
  const merge = arrayMerges[0];
  assert.equal(merge.key, 'offerings');
  assert.deepEqual(merge.addedItems, ['DSP电脑调音']);
  assert.deepEqual(merge.mergedItems, ['无损音响升级', '双层门板隔音', 'DSP电脑调音']);
});

test('diffProfiles 标量字段值不同时进入 conflicts', () => {
  const existing = {
    detailed_address: evidence('成都市武侯区旧地址'),
  };
  const draft = {
    detailed_address: evidence('成都市高新区天府大道888号', '新地址：成都市高新区天府大道888号'),
  };

  const { additions, conflicts, arrayMerges } = diffProfiles(existing, draft);

  assert.equal(additions.length, 0);
  assert.equal(arrayMerges.length, 0);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].key, 'detailed_address');
  assert.equal(conflicts[0].existingValue, '成都市武侯区旧地址');
  assert.equal(conflicts[0].newValue, '成都市高新区天府大道888号');
});

test('diffProfiles 别名字段不会被误判为新增', () => {
  // existing 用规范键 offerings，draft 用别名 main_business
  const existing = {
    offerings: evidence(['无损音响升级']),
  };
  const draft = {
    main_business: evidence(['无损音响升级']),
  };

  const { additions, conflicts, arrayMerges, unchanged } = diffProfiles(existing, draft);

  assert.equal(additions.length, 0);
  assert.equal(conflicts.length, 0);
  assert.equal(arrayMerges.length, 0);
  assert.ok(unchanged.includes('offerings'));
});

test('applyDiffDecisions 冲突字段 skip 时保留 existing', () => {
  const existing = {
    detailed_address: evidence('成都市武侯区旧地址'),
  };
  const draft = {
    detailed_address: evidence('成都市高新区天府大道888号', '新地址：成都市高新区天府大道888号'),
  };

  const merged = applyDiffDecisions(existing, draft, {
    conflicts: { detailed_address: 'skip' },
  });

  assert.equal(merged.detailed_address.value, '成都市武侯区旧地址');
});

test('applyDiffDecisions 冲突字段 overwrite 时保留 draft 的 source_quote 与 confidence', () => {
  const existing = {
    detailed_address: evidence('成都市武侯区旧地址'),
  };
  const draft = {
    detailed_address: evidence('成都市高新区天府大道888号', '新地址：成都市高新区天府大道888号', 0.92),
  };

  const merged = applyDiffDecisions(existing, draft, {
    conflicts: { detailed_address: 'overwrite' },
  });

  assert.equal(merged.detailed_address.value, '成都市高新区天府大道888号');
  assert.equal(merged.detailed_address.source_quote, '新地址：成都市高新区天府大道888号');
  assert.ok(merged.detailed_address.confidence > 0.9);
});

test('applyDiffDecisions 数组字段默认合并去重', () => {
  const existing = {
    offerings: evidence(['无损音响升级', '双层门板隔音']),
  };
  const draft = {
    offerings: evidence(['DSP电脑调音', '双层门板隔音']),
  };

  const merged = applyDiffDecisions(existing, draft, {});

  assert.deepEqual(merged.offerings.value, ['无损音响升级', '双层门板隔音', 'DSP电脑调音']);
});

test('applyDiffDecisions 未在 diff 中的字段保留 existing', () => {
  const existing = {
    company_name: evidence('行乐音改'),
    contact_info: evidence('028-12345678'),
  };
  const draft = {
    detailed_address: evidence('成都市高新区天府大道888号'),
  };

  const merged = applyDiffDecisions(existing, draft, {});

  assert.equal(merged.company_name.value, '行乐音改');
  assert.equal(merged.contact_info.value, '028-12345678');
  assert.equal(merged.detailed_address.value, '成都市高新区天府大道888号');
});

test('applyDiffDecisions 新增字段 skip 时不会写入 merged', () => {
  const existing = {
    company_name: evidence('行乐音改'),
  };
  const draft = {
    company_name: evidence('行乐音改'),
    brand_story: evidence('品牌成立于 2010 年。'),
  };

  const merged = applyDiffDecisions(existing, draft, {
    additions: { brand_story: 'skip' },
  });

  assert.equal(merged.brand_story, undefined);
});
