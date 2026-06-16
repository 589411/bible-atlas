#!/usr/bin/env node
/* verify_quotes.js — 關鍵時刻「逐字金句」硬檢查
 * 對 data/highlights.json 每一幕:抓該章(及 ref/parallels 所列各章)和合本 CUV,
 * 兩邊都只留中文字(去標點/空格/破折號/敬語空格),斷言:
 *   - quote 是某目標章的「連續子字串」
 *   - 每句台詞(who 非「旁白」;含「耶和華」)也是連續子字串
 * 旁白可自由撰寫,不檢查。
 *
 * 用法:
 *   node verify_quotes.js                 # 全量,線上抓 bolls(在你的 Mac 上跑)
 *   node verify_quotes.js --only 代下16,王上18
 *   node verify_quotes.js --no-fetch      # 只用 cuv_cache/ 既有快取,沒有的略過(沙箱用)
 * 快取:cuv_cache/{書卷編號}_{章}.json,格式同 bolls 回傳。
 */
const fs = require('fs'), path = require('path');
const ROOT = __dirname;
const CACHE = path.join(ROOT, 'cuv_cache');
const ABBR = {"創":1,"出":2,"利":3,"民":4,"申":5,"書":6,"士":7,"得":8,"撒上":9,"撒下":10,"王上":11,"王下":12,"代上":13,"代下":14,"拉":15,"尼":16,"斯":17,"伯":18,"詩":19,"箴":20,"傳":21,"歌":22,"賽":23,"耶":24,"哀":25,"結":26,"但":27,"何":28,"珥":29,"摩":30,"俄":31,"拿":32,"彌":33,"鴻":34,"哈":35,"番":36,"該":37,"亞":38,"瑪":39,"太":40,"可":41,"路":42,"約":43,"徒":44,"羅":45,"林前":46,"林後":47,"加":48,"弗":49,"腓":50,"西":51,"帖前":52,"帖後":53,"提前":54,"提後":55,"多":56,"門":57,"來":58,"雅":59,"彼前":60,"彼後":61,"約壹":62,"約貳":63,"約參":64,"猶":65,"啟":66};
const FULL = {"創世記":1,"出埃及記":2,"利未記":3,"民數記":4,"申命記":5,"約書亞記":6,"士師記":7,"路得記":8,"撒母耳記上":9,"撒母耳記下":10,"列王紀上":11,"列王紀下":12,"歷代志上":13,"歷代志下":14,"以斯拉記":15,"尼希米記":16,"以斯帖記":17,"約伯記":18,"詩篇":19,"箴言":20,"傳道書":21,"雅歌":22,"以賽亞書":23,"耶利米書":24,"耶利米哀歌":25,"以西結書":26,"但以理書":27,"何西阿書":28,"約珥書":29,"阿摩司書":30,"俄巴底亞書":31,"約拿書":32,"彌迦書":33,"那鴻書":34,"哈巴谷書":35,"西番雅書":36,"哈該書":37,"撒迦利亞書":38,"瑪拉基書":39,"馬太福音":40,"馬可福音":41,"路加福音":42,"約翰福音":43,"使徒行傳":44,"羅馬書":45,"哥林多前書":46,"哥林多後書":47,"加拉太書":48,"以弗所書":49,"腓立比書":50,"歌羅西書":51,"帖撒羅尼迦前書":52,"帖撒羅尼迦後書":53,"提摩太前書":54,"提摩太後書":55,"提多書":56,"腓利門書":57,"希伯來書":58,"雅各書":59,"彼得前書":60,"彼得後書":61,"約翰一書":62,"約翰二書":63,"約翰三書":64,"猶大書":65,"啟示錄":66};
const ABBRS = Object.keys(ABBR).sort((a,b)=>b.length-a.length);
const FULLS = Object.keys(FULL).sort((a,b)=>b.length-a.length);

const args = process.argv.slice(2);
const NO_FETCH = args.includes('--no-fetch');
// 只在明確給 --only 時才啟用(避免 zsh 把行尾 # 註解當參數而誤關全部檢查)
let ONLY = null;
const _eq = args.find(a => a.startsWith('--only='));
const _oi = args.indexOf('--only');
const _onlyArg = _eq ? _eq.split('=')[1] : (_oi >= 0 ? (args[_oi+1] || '') : '');
if (_onlyArg) ONLY = new Set(_onlyArg.split(',').map(s => s.trim()));

// 異體字正規化(兩邊都套):和合本與我方用字差異不算錯
// 和合本慣用字 → 正規化(兩邊都套):啊/阿、哪/那、裡/裏 等差異不算錯
const VARIANT = {'裡':'裏','着':'著','麽':'麼','嗎':'麼','啊':'阿','哪':'那','吧':'罷','陞':'升','菓':'果','喫':'吃'};
const canon = s => (s||'').replace(/[裡着麽嗎啊哪吧陞菓喫]/g, c => VARIANT[c] || c);
// 先剝掉 bolls 夾在經文中的編註:（原文是…）（或作…）等,再只留中文字
const stripNotes = s => (s||'').replace(/（[^（）]*）/g,'').replace(/\([^()]*\)/g,'');
const cjk = s => canon((stripNotes(s).match(/[一-鿿]/g) || []).join(''));
// 把我方台詞切成子句(刪去整個連接子句仍算逐字,但杜撰/改字會被擋)
const clauses = s => (s||'').split(/[，,；;。、：:！!？?\s]+/).map(c=>cjk(c)).filter(c=>c.length>=2);

function keyToCh(k){ // 「代下16」→{id,ch}
  const name = ABBRS.find(a=>k.startsWith(a)); if(!name) return null;
  const m = k.slice(name.length).match(/\d+/);
  return { id: ABBR[name], ch: m?parseInt(m[0],10):1 };
}
function refChapters(ref){ // 「歷代志下 18:13;列王紀上 22:14」→[{id,ch}...]
  const out=[];
  (ref||'').split(/[;；]/).forEach(seg=>{
    seg=seg.trim(); const name=FULLS.find(f=>seg.startsWith(f)); if(!name) return;
    const m=seg.slice(name.length).match(/\d+/); out.push({id:FULL[name], ch:m?parseInt(m[0],10):1});
  });
  return out;
}
async function getChapter(id,ch){
  const f = path.join(CACHE, `${id}_${ch}.json`);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f,'utf8'));
  if (NO_FETCH) return null;
  const url = `https://bolls.life/get-text/CUV/${id}/${ch}/`;
  const r = await fetch(url); const j = await r.json();
  try { fs.mkdirSync(CACHE,{recursive:true}); fs.writeFileSync(f, JSON.stringify(j)); } catch(e){}
  return j;
}

(async()=>{
  const H = JSON.parse(fs.readFileSync(path.join(ROOT,'data/highlights.json'),'utf8')).highlights;
  let checked=0, skipped=0, fails=0, warns=0;
  for (const [key,h] of Object.entries(H)) {
    if (ONLY && !ONLY.has(key)) continue;
    // 蒐集目標章:本尊 key + parallels + ref
    const targets=[]; const add=o=>{ if(o && !targets.some(t=>t.id===o.id&&t.ch===o.ch)) targets.push(o); };
    add(keyToCh(key));
    (h.parallels||[]).forEach(p=>add(keyToCh(p)));
    refChapters(h.ref).forEach(add);
    // 取各章 CJK 文字
    let pool=''; let haveText=false;
    for (const t of targets){ const j=await getChapter(t.id,t.ch); if(j){ haveText=true; pool += ' ' + j.map(v=>cjk(v.text)).join(' ');} }
    if (!haveText){ skipped++; continue; }
    const poolCjk = pool.replace(/\s+/g,'');
    checked++;
    // 嚴格(整句連續):金句 + key 行 —— 這是「值得停下的金句」,必須逐字
    const strict=[];
    if (h.quote) strict.push(['🔴 quote', h.quote]);
    (h.script||[]).forEach((l,i)=>{ if(l.key && l.who!=='旁白') strict.push([`🔴 script[${i}]/${l.who}(key)`, l.text]); });
    for (const [label,text] of strict){
      const t = cjk(text);
      if (t && !poolCjk.includes(t)){
        fails++;
        console.log(`${label.split(' ')[0]} ${key} ${label.split(' ')[1]}: 金句非原文連續子字串`);
        console.log(`    我方: ${text}`);
      }
    }
    // 寬鬆(逐句連續):其餘台詞 —— 容許刪掉整個連接子句,但每個保留子句仍須逐字
    (h.script||[]).forEach((l,i)=>{
      if (l.who==='旁白' || l.key) return;
      for (const c of clauses(l.text)){
        if (!poolCjk.includes(c)){
          warns++;
          console.log(`🟡 ${key} script[${i}]/${l.who}: 子句非原文「${c}」`);
          console.log(`    我方: ${l.text}`);
          break;
        }
      }
    });
  }
  console.log(`\n檢查 ${checked} 幕,略過 ${skipped} 幕(無快取)`);
  console.log(`🔴 金句逐字不符 ${fails} 處(必修)  🟡 支援台詞子句存疑 ${warns} 處(請複核)`);
  console.log(fails===0 ? '✅ 金句逐字全部通過' : '請優先修正上面 🔴 金句');
  process.exit(fails?1:0);
})();
