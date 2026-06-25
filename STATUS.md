# STATUS — 聖經像素地圖

## 現況（2026-06-26）
完成兩件大事:**逐卷地名圖層** + **新約時代細分（3 段）**。

### 1. 逐卷地名圖層
保羅書信等深連結進站時,地圖只高亮該卷提到的地名、其餘淡顯,並播放該卷專屬「戰報」導讀。
- `data/book-places.json`（新）— 13 卷保羅書信:title / era / intro（戰報導讀）/ cities（地圖既有 key）
- `data/maps/mediterranean.json` — 補 12 個書信地名座標
- `engine/index.html` — 載入 book-places、深連結聚焦、聚焦感知 drawMap/renderLabels（含**防疊字** `.below`）、聚焦條 UI、聚焦時戰報改播本卷 intro、深連結優先序修正（`?era` > `?ref` > `#era` hash）

### 2. 新約時代細分（原單一「使徒行傳」拆成 3 段）
- `data/eras/acts.json` — 使徒行傳（books 收斂為僅「使徒行傳」）
- `data/eras/epistles_paul.json`（新, order 155）— **保羅書信**,5 大事記
- `data/eras/epistles_general.json`（新, order 160）— **使徒書信與啟示錄**,5 大事記
- `data/book_eras.json` — 保羅 13 卷→epistles_paul;來/雅/彼/約/猶/啟→epistles_general;徒 維持 acts
- `data/manifest.json` — 加入兩個新時代
- `sw.js` — 新增兩個 era 檔入 SHELL,CACHE 升 v5

（以上動到 engine/maps/eras 等架構區,皆於本次對話取得 Joseph 明確授權。）

## 卡在哪
無。已 commit + push 到 main（`f5871f4`,2026-06-26）,atlas.launchdock.app 自動部署中。
已視覺驗證:`?ref=加3`→落到「保羅書信」、地名聚焦、戰報播加拉太書導讀、大事記 5 筆、時代列顯示 3 段新約。`node scripts/validate.js` 通過（18 時代）。

## 下一個具體動作
1. 部署後上線抽驗 `atlas.launchdock.app/engine/?ref=加3`、`?ref=雅1`（硬重載 Cmd+Shift+R 避開舊 SW）。
2. 範圍外（待指示）:書信的「關鍵時刻」逐章導讀（highlights.json,無上限,真正的細讀層;羅8/林前13/弗6/來11/約一4/啟21…）。
3. 未追蹤 `.gitignore`（cuv_cache/,非本次任務）仍待 Joseph 決定是否提交。

## 本地預覽
`python3 -m http.server 8000` → `http://localhost:8000/engine/?ref=加3`（保羅書信）、`?ref=雅1`（使徒書信與啟示錄）
（提醒:換版後在瀏覽器**硬重載** Cmd+Shift+R,舊 service worker/殘留 hash 會造成假象。）
