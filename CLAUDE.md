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

## 本地預覽

```bash
python3 -m http.server 8000
# 開啟 http://localhost:8000/engine/
```
