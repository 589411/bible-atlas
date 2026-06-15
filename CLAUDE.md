# CLAUDE.md — 聖經像素地圖專案工作規則

你在這個專案中的角色是**內容編輯**,負責把 `data/eras-draft/` 中的草稿
補完文字後上線。空間設計(地圖、座標、疆域、路線)已由架構階段完成並驗證,
**不是你的工作範圍**。

## 絕對規則

1. **禁止修改** `engine/`、`data/maps/`、`schema/`、`scripts/` 內的任何檔案
2. **禁止自創地名或座標**:只能使用各地圖 `cities` 既有的 key
3. **禁止修改草稿中已填好的空間欄位**:`mapId`、`order`、`territory`、
   `routes`、`cities`、`capitals`、事件的 `city`、人物的 `avatar` 與 `tagClass`
4. 開始任何工作前,先完整閱讀 `schema/style-guide.md`(寫作鐵則與字數限制)

## 標準工作流程(每次處理一個時代)

1. 從 `data/eras-draft/` 挑選指定的時代檔案
2. 將所有 `TODO` 文字欄位補完:`desc`(60–160字)、`intro`(≤60字)、
   人物 `desc`(8–30字)、事件 `text`(20–90字);
   `ref` 已有提示者核實補全,有平行記載必須以「;」並列
3. 將完成的檔案**複製**到 `data/eras/`(草稿保留)
4. 執行 `node scripts/validate.js`,有錯誤就修正文字,直到通過
5. 將該時代加入 `data/manifest.json` 的 `eras` 清單(依 order 排序插入)
6. 再次執行驗證,通過後回報完成,**一次只處理一個時代**

## 品質自檢(提交前)

- [ ] 同名人物已消歧(例:施洗約翰 vs 使徒約翰、掃羅王 vs 掃羅/保羅)
- [ ] desc 結尾點出本時代的關鍵轉折或屬靈意義
- [ ] 平行經文全部列出(列王紀‖歷代志、四福音等)
- [ ] 語氣是策略遊戲圖鑑:精煉、有畫面感、不說教
- [ ] `node scripts/validate.js` 通過,無任何 ✗

## 關鍵時刻(data/highlights.json)— RPG 對話導讀

章節級的「值得停下來的時刻」,以 RPG 對話框重現重要對話/教導/禱告/人物刻畫,
吸引讀者去讀該章。資料與 engine 分離;**新增內容只動 `data/highlights.json`**。
(本功能的 engine 程式與 messiah 樣式、parallels 路由屬架構階段,已獲使用者明確授權;
日後若需改 engine 行為,仍須再次取得授權。)

### 鐵則(不可違背)

1. **金句(`quote`)與 `script` 中說話者的台詞一律和合本 CUV 逐字**,用
   `https://bolls.life/get-text/CUV/{書卷編號}/{章}/` 核對;要截短只取**連續**原文片段,**絕不改寫**。
   旁白(`旁白`)可自行撰寫導引文字,但不可放進角色口中。
2. **不描繪神的臉**:`耶和華` 用保留字,渲染為無頭像的金色「聲音框」。
3. **耶穌**用 cast 的 `faction: "messiah"`:沿用既有像素頭像 + 柔和光暈 + **紅字台詞**
   (`#ff9d76`);耶穌親口的話即「紅字」,務必逐字。
4. **平行經文一幕只寫一次**:同一事件被多卷記載(四福音、列王紀‖歷代志…)時,
   用**最完整的那卷**當本尊 key,`ref` 並列各卷出處(以 `;` 分隔),
   並於 `parallels` 列出其餘平行章 key(例 本尊 `太8`,`parallels:["可4","路8"]`)。
   嚴禁同一幕做兩遍。
5. **hook 不爆雷**:鋪張力與懸念,把結局留在章裡;金句本身可作為引子。

### 資料格式

key = daily-bread 書卷縮寫 + 章號(同 `book_eras.json` 規則,最長匹配)。每筆:

- `era`(時代 id)、`type`(對話/教導/禱告/人物)、`city`(選配;**只能用該時代地圖既有 key**,無則 `null`)
- `title`、`quote`(金句 ≤60)、`ref`、`hook`(40–90)、選配 `parallels`(平行章 key 陣列)
- `cast`:`{ key: { name, faction, avatar:{skin,hair,beard,robe,crown?} } }`;
  `faction` ∈ prophet/south/north/empire/folk/messiah(決定名牌色與耶穌特效)
- `script`:`[{ who, text, key? }]`;`who` 為 cast key 或保留字 `旁白`/`耶和華`;
  每行 `text` ≤80;**恰好一行** `key:true`(金句強調行);半形標點、繁體字。

### 深連結(對接 daily-bread)

`engine/?ref=代下20`(或平行章如 `?ref=可4`)進站時,`findHighlight()` 先找本尊 key、
找不到再比對各幕 `parallels`,命中就落到該時代並**自動演出**那一幕。
daily-bread「🗺️ 看歷史地圖」鈕送的就是 `?ref=` + 當天靈修章,格式一致,免改 daily-bread。

### 工作流程(每批場景)

1. 先用 bolls API 抓該章原文,逐字核對金句與台詞。
2. 依上述格式寫進 `data/highlights.json`(平行幕記得設 `parallels`)。
3. `node validate_highlights.js` → 必須 `✅ 驗證通過`(格式/字數/標點/city/parallels)。
4. `node scripts/validate.js` → 確認時代資料未被破壞(仍 `驗證通過`)。
5. 若新增需離線快取的檔案才動 `sw.js`(加入 SHELL 並升 `CACHE` 版本);
   一般只改 `data/highlights.json` 不必動 sw.js(network-first 會更新)。
6. commit & push;atlas.launchdock.app 自動部署。

## 本地預覽

```bash
python3 -m http.server 8000
# 開啟 http://localhost:8000/engine/
# 關鍵時刻測試:http://localhost:8000/engine/?ref=代下20  或  ?ref=約3
```
