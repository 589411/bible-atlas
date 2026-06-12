#!/usr/bin/env node
/**
 * 聖經像素地圖 — 時代資料驗證腳本(零依賴)
 * 用法:node scripts/validate.js
 * 規則來源:schema/era.schema.json + schema/style-guide.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRAFT_MODE = process.argv.includes('--drafts');
const ERAS_DIR = path.join(ROOT, 'data', DRAFT_MODE ? 'eras-draft' : 'eras');
if (DRAFT_MODE) console.log('【草稿模式】只驗證空間欄位(地名/疆域/路線),略過字數規則\n');
const MAPS_DIR = path.join(ROOT, 'data', 'maps');
const MANIFEST = path.join(ROOT, 'data', 'manifest.json');

const FACTIONS = ['united', 'north', 'south', 'empire', 'foreign'];
const TAG_CLASSES = ['united', 'north', 'south', 'prophet', 'empire', 'other'];
const TERRAIN_TYPES = ['sea', 'plain', 'hill', 'mountain', 'desert', 'valley', 'water'];
const HEX = /^#[0-9a-fA-F]{6}$/;

let errors = 0;
const fail = (file, msg) => { errors++; console.error(`✗ [${file}] ${msg}`); };
const ok = (file) => console.log(`✓ ${file}`);
const len = (s) => [...s].length; // 以字元計,中文一字算一

function loadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { fail(path.basename(p), 'JSON 解析失敗:' + e.message); return null; }
}

/* ── 載入地圖 ── */
const maps = {};
for (const f of fs.readdirSync(MAPS_DIR).filter(f => f.endsWith('.json'))) {
  const m = loadJSON(path.join(MAPS_DIR, f));
  if (!m) continue;
  const name = f.replace('.json', '');
  if (m.id !== name) fail(f, `地圖 id「${m.id}」與檔名不一致`);
  if (!Number.isInteger(m.cols) || !Number.isInteger(m.rows))
    fail(f, 'cols/rows 必須是整數');
  (m.terrain || []).forEach((t, i) => {
    if (!TERRAIN_TYPES.includes(t.type)) fail(f, `terrain[${i}] 未知地形「${t.type}」`);
    checkRect(f, `terrain[${i}]`, t.rect, m);
  });
  for (const [k, c] of Object.entries(m.cities || {})) {
    if (!c.name || !Number.isInteger(c.c) || !Number.isInteger(c.r))
      fail(f, `城市 ${k} 缺少 name/c/r`);
    else if (c.c < 0 || c.c >= m.cols || c.r < 0 || c.r >= m.rows)
      fail(f, `城市 ${k} 座標 (${c.c},${c.r}) 超出地圖範圍`);
  }
  maps[m.id] = m;
}

function checkRect(file, label, rect, map) {
  if (!Array.isArray(rect) || rect.length !== 4 || !rect.every(Number.isInteger))
    return fail(file, `${label} rect 格式錯誤,需為 [c1,r1,c2,r2] 整數`);
  const [c1, r1, c2, r2] = rect;
  if (c1 > c2 || r1 > r2) fail(file, `${label} rect 起點大於終點`);
  if (c1 < 0 || r1 < 0 || c2 >= map.cols || r2 >= map.rows)
    fail(file, `${label} rect 超出地圖範圍 (${map.cols}x${map.rows})`);
}

/* ── 驗證時代 ── */
const eraFiles = fs.readdirSync(ERAS_DIR).filter(f => f.endsWith('.json'));
const eraIds = new Set();
const orders = new Set();

for (const f of eraFiles) {
  const e = loadJSON(path.join(ERAS_DIR, f));
  if (!e) continue;
  const before = errors;

  if (e.id !== f.replace('.json', '')) fail(f, `id「${e.id}」與檔名不一致`);
  if (eraIds.has(e.id)) fail(f, `id 重複:${e.id}`); eraIds.add(e.id);
  if (orders.has(e.order)) fail(f, `order ${e.order} 與其他時代重複`); orders.add(e.order);

  const map = maps[e.mapId];
  if (!map) { fail(f, `mapId「${e.mapId}」不存在於 data/maps/`); continue; }

  // 字數紀律(草稿模式略過)
  if (!DRAFT_MODE) {
    if (!e.title || len(e.title) > 12) fail(f, 'title 缺少或超過 12 字');
    if (!e.years || len(e.years) > 24) fail(f, 'years 缺少或超過 24 字');
    if (!e.desc || len(e.desc) < 60 || len(e.desc) > 160)
      fail(f, `desc 需 60–160 字,目前 ${e.desc ? len(e.desc) : 0} 字`);
    if (!e.intro || len(e.intro) > 60) fail(f, 'intro 缺少或超過 60 字');
  }

  // 疆域與路線:至少一者非空
  const hasTerritory = Array.isArray(e.territory) && e.territory.length > 0;
  const hasRoutes = Array.isArray(e.routes) && e.routes.length > 0;
  if (!hasTerritory && !hasRoutes)
    fail(f, 'territory 與 routes 至少需要一者非空');
  (e.territory || []).forEach((t, i) => {
    if (!FACTIONS.includes(t.faction)) fail(f, `territory[${i}] 未知陣營「${t.faction}」`);
    checkRect(f, `territory[${i}]`, t.rect, map);
  });

  // 路線
  (e.routes || []).forEach((rt, i) => {
    if (!rt.name || len(rt.name) > 14) fail(f, `routes[${i}] name 缺少或超過 14 字`);
    if (rt.color !== undefined && !HEX.test(rt.color))
      fail(f, `routes[${i}] color 需為 #rrggbb`);
    if (!Array.isArray(rt.points) || rt.points.length < 2 || rt.points.length > 10)
      fail(f, `routes[${i}] points 需 2–10 個地名`);
    (rt.points || []).forEach(k => {
      if (!map.cities[k]) fail(f, `routes[${i}] 途經點「${k}」不存在於地圖 ${e.mapId}`);
    });
  });

  // 城市引用
  if (!Array.isArray(e.cities) || e.cities.length < 4 || e.cities.length > 8)
    fail(f, `cities 需 4–8 個,目前 ${e.cities ? e.cities.length : 0} 個`);
  (e.cities || []).forEach(k => {
    if (!map.cities[k]) fail(f, `城市 key「${k}」不存在於地圖 ${e.mapId}(禁止自創座標)`);
  });
  (e.capitals || []).forEach(k => {
    if (!(e.cities || []).includes(k)) fail(f, `京城「${k}」必須包含在 cities 內`);
  });

  // 人物
  if (!Array.isArray(e.people) || e.people.length < 2 || e.people.length > 5)
    fail(f, `people 需 2–5 位,目前 ${e.people ? e.people.length : 0} 位`);
  (e.people || []).forEach((p, i) => {
    if (!DRAFT_MODE) {
      if (!p.name || len(p.name) > 14) fail(f, `people[${i}] name 缺少或超過 14 字`);
      if (!p.tag || len(p.tag) > 8) fail(f, `people[${i}] tag 缺少或超過 8 字`);
      if (!p.desc || len(p.desc) < 8 || len(p.desc) > 30)
        fail(f, `people[${i}] desc 需 8–30 字,目前 ${p.desc ? len(p.desc) : 0} 字`);
    }
    if (!TAG_CLASSES.includes(p.tagClass)) fail(f, `people[${i}] 未知 tagClass「${p.tagClass}」`);
    const av = p.avatar || {};
    ['skin', 'hair', 'robe'].forEach(k => {
      if (!HEX.test(av[k] || '')) fail(f, `people[${i}] avatar.${k} 需為 #rrggbb`);
    });
    if (av.beard !== undefined && !HEX.test(av.beard))
      fail(f, `people[${i}] avatar.beard 需為 #rrggbb`);
  });

  // 事件
  if (!Array.isArray(e.events) || e.events.length < 2 || e.events.length > 5)
    fail(f, `events 需 2–5 件,目前 ${e.events ? e.events.length : 0} 件`);
  (e.events || []).forEach((ev, i) => {
    if (!map.cities[ev.city]) fail(f, `events[${i}] 地點「${ev.city}」不存在於地圖`);
    if (!DRAFT_MODE) {
      if (!ev.text || len(ev.text) < 20 || len(ev.text) > 90)
        fail(f, `events[${i}] text 需 20–90 字,目前 ${ev.text ? len(ev.text) : 0} 字`);
      if (!ev.ref) fail(f, `events[${i}] 缺少經文出處 ref`);
    }
  });

  // 書卷
  if (!Array.isArray(e.books) || e.books.length < 1) fail(f, 'books 至少 1 卷');

  if (errors === before) ok(f);
}

/* ── 驗證 manifest(草稿模式略過) ── */
const manifest = DRAFT_MODE ? null : loadJSON(MANIFEST);
if (manifest) {
  const listed = new Set(manifest.eras.map(x => x.id));
  manifest.eras.forEach(x => {
    if (!fs.existsSync(path.join(ROOT, 'data', x.file)))
      fail('manifest.json', `檔案不存在:${x.file}`);
    if (!eraIds.has(x.id)) fail('manifest.json', `時代 id「${x.id}」沒有對應資料檔`);
  });
  eraIds.forEach(id => {
    if (!listed.has(id))
      console.warn(`⚠ 提醒:時代「${id}」尚未加入 manifest,不會顯示在網站上`);
  });
  if (!listed.has(manifest.defaultEra))
    fail('manifest.json', `defaultEra「${manifest.defaultEra}」不在 eras 清單中`);
}

console.log('');
if (errors) { console.error(`驗證失敗:共 ${errors} 個錯誤`); process.exit(1); }
console.log(`驗證通過:${eraFiles.length} 個時代、${Object.keys(maps).length} 張地圖`);
