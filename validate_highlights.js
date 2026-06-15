#!/usr/bin/env node
/* 關鍵時刻(data/highlights.json)驗證器。
   用法:node validate_highlights.js  (在 repo 根目錄)
   檢查:時代/類型/城市 key/字數/半形標點/繁體/cast 頭像/script/恰好一行金句/parallels 不衝突。
   注意:engine 與 scripts/ 為架構階段,本檔不取代 scripts/validate.js;兩者都要過。 */
const fs = require('fs'), path = require('path');
const base = __dirname;
const H = JSON.parse(fs.readFileSync(path.join(base, 'data/highlights.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(base, 'data/manifest.json'), 'utf8'));
const eraCities = {};
for (const e of manifest.eras) {
  const era = JSON.parse(fs.readFileSync(path.join(base, 'data', e.file), 'utf8'));
  eraCities[era.id] = new Set(era.cities || []);
}
const TYPES = new Set(['對話', '教導', '禱告', '人物']);
const FACTIONS = new Set(['united', 'prophet', 'south', 'north', 'empire', 'folk', 'messiah']);
const RESERVED = new Set(['旁白', '耶和華']);            // 無頭像:旁白敘述 / 耶和華金色聲音框
const FW = /[，；：（）！？]/;                              // 禁止全形標點(頓號、與句號。除外)
const SIMP = /[这为对说话过电别让点见们来时国实发声银历将这]/;  // 常見簡體掃描(不含「后」:王后為正體)
const len = s => [...s].length;
let errs = 0, n = 0;
const primaryKeys = new Set(Object.keys(H.highlights));
const seenParallel = new Map();
for (const [key, h] of Object.entries(H.highlights)) {
  n++; const fail = m => { console.log(`✗ ${key}: ${m}`); errs++; };
  if (!eraCities[h.era]) fail(`era「${h.era}」不存在`);
  if (!TYPES.has(h.type)) fail(`type「${h.type}」不合法`);
  if (h.city !== null && !(eraCities[h.era] && eraCities[h.era].has(h.city))) fail(`city「${h.city}」不在時代 ${h.era}`);
  for (const f of ['title', 'quote', 'ref', 'hook']) if (!h[f] || typeof h[f] !== 'string') fail(`欄位 ${f} 缺`);
  if (h.quote && len(h.quote) > 60) fail(`quote ${len(h.quote)} 字 >60`);
  if (h.hook && (len(h.hook) < 40 || len(h.hook) > 90)) fail(`hook ${len(h.hook)} 字 (需 40-90)`);
  for (const [ck, c] of Object.entries(h.cast || {})) {
    if (!c.name) fail(`cast.${ck} 缺 name`);
    if (!FACTIONS.has(c.faction)) fail(`cast.${ck} faction「${c.faction}」不合法`);
    // messiah 可無頭像(從天上來的聲音);其餘必須有完整頭像
    if (c.faction !== 'messiah' || c.avatar) {
      if (!c.avatar || !c.avatar.skin || !c.avatar.robe) fail(`cast.${ck} avatar 不完整`);
    }
  }
  if (!Array.isArray(h.script) || !h.script.length) fail('script 缺或空');
  let keyCount = 0;
  (h.script || []).forEach((ln, i) => {
    if (!ln.who || !ln.text) return fail(`script[${i}] 缺 who/text`);
    if (!RESERVED.has(ln.who) && !(h.cast && h.cast[ln.who])) fail(`script[${i}] who「${ln.who}」不在 cast/保留字`);
    if (len(ln.text) > 80) fail(`script[${i}] text ${len(ln.text)} 字 >80`);
    if (ln.key) keyCount++;
  });
  if (keyCount !== 1) fail(`需恰好 1 行 key:true(目前 ${keyCount})`);
  if (h.parallels !== undefined) {
    if (!Array.isArray(h.parallels)) fail('parallels 必須是陣列');
    else for (const p of h.parallels) {
      if (typeof p !== 'string') { fail('parallels 含非字串'); continue; }
      if (p === key) fail('parallels 不可等於自己的 key');
      if (primaryKeys.has(p)) fail(`parallels「${p}」與某幕本尊 key 衝突`);
      if (seenParallel.has(p)) fail(`parallels「${p}」已被 ${seenParallel.get(p)} 使用`);
      else seenParallel.set(p, key);
    }
  }
  const texts = [h.quote, h.hook, h.title].concat((h.script || []).map(l => l.text));
  for (const t of texts) {
    if (t && FW.test(t)) fail(`全形標點:${t.match(FW)[0]} → ${t.slice(0, 12)}`);
    if (t && SIMP.test(t)) fail(`疑似簡體:${t.match(SIMP)[0]} → ${t.slice(0, 12)}`);
  }
}
console.log(`\n檢查 ${n} 筆,${errs} 個錯誤`);
console.log(errs === 0 ? '✅ 驗證通過' : '請修正上述錯誤');
process.exit(errs ? 1 : 0);
