# 聖經像素地圖(Bible Pixel Atlas)

以「時代」為座標的聖經歷史閱讀地圖。復古戰略遊戲風格(三國志/大戰略),
幫助華人讀者建立空間感與時間感,解決人名地名混淆的閱讀障礙。

## 核心架構:引擎與資料分離

```
bible-atlas/
├── engine/index.html        # 引擎(凍結):渲染地圖/人物/戰報,不含內容
├── data/
│   ├── manifest.json        # 時代索引與網站標題
│   ├── maps/canaan.json     # 舞台地圖:地形 + 地名座標庫(唯一座標來源)
│   └── eras/*.json          # 每個時代一個檔(約 2KB),可獨立生成
├── schema/
│   ├── era.schema.json      # 時代資料規格
│   └── style-guide.md       # 風格指南 + Sonnet 生成模板(品質憲法)
├── scripts/validate.js      # 驗證腳本(零依賴)
└── .github/workflows/validate.yml  # PR 自動驗證
```

設計原則:
1. **引擎凍結**:新增內容永不修改程式,引擎品質不隨時間劣化
2. **座標單一來源**:時代資料只能引用地圖地名 key,空間一致性由地圖保證
3. **品質來自規格而非模型**:schema + 風格指南 + 驗證腳本三層把關,
   之後用 Sonnet/Haiku 量產內容也不會掉品質
4. **每次生成任務 < 6K tokens**:模板 + 地名庫 + 一個範例 + 產出,
   永遠不會碰到上下文限制;整本聖經 = 約 15 個獨立小任務

## 本地預覽

```bash
cd bible-atlas
python3 -m http.server 8000
# 開啟 http://localhost:8000/engine/
```

注意:直接雙擊 HTML 無法讀取 JSON(瀏覽器 file:// 限制),
部署到 Cloudflare Pages 則直接可用。

## 分工模式(推薦):草稿補完

困難部分(地圖座標、疆域 rect、路線、人物視覺)已完成,放在
`data/eras-draft/` 共 11 個時代草稿,空間欄位已通過
`node scripts/validate.js --drafts` 驗證。

後續模型(Sonnet 即可)的工作只有**補文字**:
在 Cowork 或 Claude Code 開啟本資料夾,規則已寫在 `CLAUDE.md`,
指令範例:「請完成 divided 時代」。流程:補 TODO → 複製到
`data/eras/` → 跑驗證 → 更新 manifest。一次一個時代。

也可用純聊天模式:貼 `schema/style-guide.md` 第四節模板 +
地圖 cities + `split.json` 範例,產出後人工存檔驗證。

## 路線圖

見 `schema/style-guide.md` 第六節:整本聖經切分為 15 個時代,
跨四張舞台地圖(canaan / neareast / exodus / mediterranean)。
詩歌智慧書與書信掛載於對應時代,不獨立成頁。

## 部署(Cloudflare Pages)

- Build command:(無)
- Output directory:`/`
- 入口:`/engine/index.html`(可設 redirect 將 `/` 導向)
