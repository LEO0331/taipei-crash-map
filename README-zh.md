# 臺北市道路交通事故熱點地圖

[English](README.md) · **繁體中文**

這是一個以 Vite + React 製作、優先支援行動裝置的臺北市道路交通事故公開資料儀表板。專案使用 Leaflet、Recharts、本機靜態 JSON 與 PWA 應用程式殼；瀏覽器執行時不會直接呼叫臺北市資料大平臺 API。

## 提供的功能

- 歷年 A1／A2 交通事故點位與路口熱點彙整。
- 年份、時段、行政區、事故類別與地點文字篩選，以及選用的附近歷史事故查詢。
- 死傷事故特徵彙整圖表，以及全市年度民眾檢舉前五大違規統計。
- 獨立的「車輛行車事故鑑定覆議」月統計模組，呈現程序性件數與 A1／A2／A3 組成。
- 預設繁體中文介面、可切換英文，並支援響應式版面與 PWA。

## 使用與解讀界線

本專案是描述性的資料探索工具。歷史件數未依交通量、行人量或其他暴露量調整，不能作為風險分數、因果關係、肇責、法律判定、鑑定品質、執法績效或道路安全結論。

事故點位、死傷事故細節、檢舉違規與鑑定覆議資料的單位及涵蓋期間不同；除非官方定義與期間相容，不應直接合併或相除。鑑定覆議模組僅為程序性的彙總統計，不是個案查詢，也不是法律成功率。

請閱讀 [儀表板決策洞察與技術說明](dashboard-decision-insights-and-technical-notes.md)，瞭解面向使用者的建議與實作風險。

## 資料轉換

前端使用的資料由 `public/data/` 下的本機靜態檔案提供；原始輸入資料存放於 `data/raw/`。

- `npm run convert:accidents`：主要事故點位與熱點。
- `npm run fetch:crash-details`、`npm run convert:crash-details`：死傷事故細節彙整。
- `npm run data:fetch:reported-violations`、`npm run data:convert:reported-violations`：年度民眾檢舉違規統計。
- `npm run data:convert:appraisal-reconsiderations`：車輛行車事故鑑定覆議月統計。

鑑定覆議來源以民國「年／月」記錄（例如 `106年1月`）。轉換器會保留原始欄位，僅以「民國年 + 1911」建立用於排序的西元 `YYYY-MM`；件數與來源 A1／A2／A3 百分比會分開保留。

## 本機開發

需求：受支援的 Node.js LTS 與 npm。

- `npm ci`：安裝鎖定版本的相依套件。
- `npm run dev`：啟動 Vite。
- `npm run build`、`npm test`、`git diff --check`：發布前檢查。
- 在可使用 Bash 的環境中，`./init.sh` 會執行建置與測試。

若調整資料轉換契約，也必須執行相對應的轉換命令，並檢查產出的 metadata 或報告。

## 部署

請部署 `npm run build` 產生的 `dist/` 目錄。已包含 GitHub Actions 的 GitHub Pages 部署流程，會以 `GITHUB_PAGES=true` 建置，並使用 `/taipei-crash-map/` 作為基底路徑。

## 專案結構

`src/` 為 React 應用程式；`scripts/` 為資料擷取與轉換器；`data/raw/` 為來源快照；`public/data/` 為前端靜態資料；`tests/` 為工具與資料轉換契約測試。
