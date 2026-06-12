---
name: update-bible-atlas
description: >
  維護與擴充「聖經像素地圖」（repo 589411/bible-atlas，線上 https://atlas.launchdock.app）。
  當使用者要新增/修改時代內容（data/eras）、用子代理量產內容（指揮模型審稿＋Sonnet撰寫）、
  調整世界視角定位圖（OVERVIEW）、維護書卷→時代對照（book_eras.json）、處理與
  daily-bread 的接合（深連結/今日讀經徽章/LINE推播地圖連結）、或部署/PWA問題時使用。
---

# 維護聖經像素地圖

**先讀 repo 根目錄 `CLAUDE.md`**——資料格式與規範的唯一真實來源；本檔是流程地圖與踩坑集。
引擎/資料分離：新增內容永不動 `engine/`；動引擎屬「架構階段」，需使用者明確授權。

## 鐵則

- **字數＝字元數（含標點）**：`validate.js` 用 `[...s].length` 計。desc 60–160、intro ≤60、人物 desc 8–30、事件 text 20–90。
- **半形標點**：逗號`,` 分號`;` 括號`()`，句末`。`，引文`「」`。禁止全形`，；（）`。
- 地名只能引用舞台地圖 `cities` 既有 key；改完 `data/` 必跑 `node scripts/validate.js` 見「驗證通過」才 commit。
- 新增舞台地圖時，必須同步在 `engine/index.html` 的 `OVERVIEW.regions` 加上該地圖在世界視角的框範圍。

## 任務地圖

**A. 子代理量產時代內容（已驗證的分工模式）**
1. 指揮模型備好上下文包：字數與標點鐵則、該地圖 cities 清單、合格範例（`data/eras/split.json`）、待補草稿。
2. Sonnet 子代理只補文字欄位（desc/intro/人物desc/事件text/ref），其餘原樣保留；**把字數計法與半形標點直接寫進提示詞**（寫進提示＝0 超標；不寫＝每篇 2–3 處超標）。
3. 撰寫可平行，但「複製到 eras/ → 插 manifest → validate」必須串行（manifest 衝突）。
4. 指揮模型審稿清單（Sonnet 實際犯過的錯）：
   - **事實錯誤**：如把羅得寫成亞伯拉罕的「妻子」（是姪兒）。
   - **簡體字混入**：如「二他连得银」。逐字掃 `连银为历这将` 等常見字。
   - **引文殘缺**：如「你被稱在天平裡,顯出你的虧欠」被截半。
   - **消歧**：施洗約翰vs使徒約翰、掃羅王vs保羅（原名掃羅）、同名王。
   - ref 平行經文全列以`;`分隔；標點統一。

**B. 世界視角定位圖（engine 的 OVERVIEW 物件）**
- `regions`：各舞台地圖在廣域圖上的框（金框＋框外壓暗＋縮放錐虛線連到大地圖）。
- `labels` 支援 `from/to`（era order）做**時代感知**：政權標籤只在存在的時代顯示。
  已考證：美索不達米亞10–80、非利士30–100、亞述90–100（612BC亡，先於南國滅亡586BC）、
  巴比倫110–120、波斯120–130（被擄期巴比倫+波斯並列＝但5政權交替）、希臘/羅馬/小亞細亞140–150。
- 耶路撒冷金點為恆定錨點。

**C. 書卷→時代對照（data/book_eras.json）**
- key＝daily-bread 縮寫，規則陣列按章範圍（from/to）取第一個命中；aliases 收全名。
- 跨時代書卷：王上(1-11所羅門/12分裂/13+並立)、王下(–16並立/17-20北亡/21+南亡)、
  代下(–9/10-12/13-28/29-32/33+)、賽(–39北亡/40+被擄)、代上10=掃羅。
- 解析時書名**最長匹配優先**（約壹 要贏 約）。

**D. 與 daily-bread 接合**
- GitHub Pages 自帶 `Access-Control-Allow-Origin: *`，兩站可互讀 `data/*.json`，免後端。
- atlas 深連結：`?ref=代下12`（經文→時代）、`?era=split`、`#era=split`；切時代寫回 hash 可分享。
- atlas「今日讀經」徽章：抓 daily-bread `schedule.json`，台北時區 `toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'})` 取今日 key；失敗安靜隱藏。
- daily-bread 端：`#atlasBtn` 按鈕（loadDay 更新 href）＋ `buildMsg()` 加 `🗺️ 歷史地圖` 行＋ worker.js 同步。

**E. 部署／PWA**
- 一個 repo 只能綁一個自訂網域 → 姊妹站各自獨立 repo（atlas / daily-bread）。
- Cloudflare CNAME 灰雲（DNS only）；GitHub「DNS check unsuccessful」常是快取，先 `curl https://網域` 驗證真實狀態再按 Check again。
- PWA 照 pwa-offline skill：network-first、SHELL 含全部 eras/maps json、改檔要升 CACHE 版本。

## 踩過的坑（部署與 git）

- **macOS `python3 -m http.server` 報 PermissionError（os.getcwd）**：終端機沒有該資料夾存取權。重新 `cd` 一次；不行就系統設定→隱私權→檔案與檔案夾，給終端機權限後重開。
- **zsh 行尾 `# 註解` 會被當參數傳給指令**（互動模式預設不認註解）。給使用者的指令別帶行內註解。
- **沙箱 git init 預設分支是 master** → `git branch -m main` 再 push。
- **沙箱殘留 `.git/HEAD.lock` 等鎖檔且沙箱刪不掉** → 請使用者在 Mac 上 `rm -f .git/*.lock`。
- **SSH `Permission denied (publickey)`** → 改 HTTPS：`git remote set-url origin https://github.com/...`；密碼欄填 PAT，或 `gh auth login`。
- **「沒有要提交的檔案」不一定是失敗**——可能前一次嘗試其實已 commit+push。先 `grep` 比對兩邊檔案、`git log`、開線上網址驗證，**別急著重做**。
- **zip 下載的資料夾沒有 `.git`** → clone 正式 repo、`cp -v` 帶入修改、`git status -s` 看到 M 再 commit；之後直接在 clone 裡工作，刪掉 zip 免兩份失同步。
- **Cloudflare Worker 的程式碼不會因 git push 更新**：repo 是資料來源（Worker 即時 fetch data/*.json），但 worker.js 程式邏輯改了要重貼 dashboard 部署。資料與程式更新路徑不同。
- **多個 `<script>` 區塊的 HTML 做語法檢查**：regex 要用非貪婪 `(.*?)` 逐塊抓，否則跨塊必報錯。

## 驗收

- `node scripts/validate.js` 全綠（15 時代、4+ 地圖）。
- 開 https://atlas.launchdock.app/ ：今日徽章顯示當天進度與正確時代；`?ref=創12` 落族長時期；
  世界視角金框與標籤隨時代切換（士師看得到非利士、看不到波斯）。
- daily-bread 端「🗺️ 看歷史地圖」連到正確時代；LINE 訊息含地圖連結。
