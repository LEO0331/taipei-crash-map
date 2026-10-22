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

## 內湖道路廊帶查核

完整說明請見[繁中 MVP](docs/neihu-congestion-decision-mvp.zh-TW.md)、[方法論](docs/neihu-congestion-methodology.md)及[交付／驗收報告](docs/neihu-congestion-delivery.md)，包含 PR #7 逐項核對、實際容量名單、截圖與限制。

獨立的「內湖交通壅塞決策」分頁提供官方交通設備與證據品質查核。[來源稽核](docs/neihu-congestion-source-audit.md)記錄資料可行性，[實作計畫](docs/neihu-congestion-implementation-plan.md)記錄範圍與驗證方式。

初版為資料完整性試點：可取得的動態 VD 檔案已過時且未明示時區，尚無經驗證的可比較歷史期間，因此不發布反覆壅塞排名。品質查核名額代表資料調查工作，不是交通工程措施。缺少觀測不代表道路不壅塞；點位車速不能視為整條廊帶旅行時間，事故件數也不參與本模組排序。

資料擷取透過明確執行的離線命令進行，訪客不會觸發官方 API。保留的官方原始位元組與 SHA256 可追溯及重新產生快照；合成資料僅供測試。JSON 與防公式注入 CSV 摘要會保留無法取得的指標與排除原因。歷史效能比較必須等待經驗證的可比較觀測；TDX 憑證不得放入瀏覽器資產或 Git。

以 `npm run data:fetch:neihu-traffic` 重用保留版本（明確加上 `-- --refresh` 才重新擷取有限的新版本），以 `npm run data:audit:neihu-traffic` 查驗雜湊與來源，再以 `npm run data:build:neihu-traffic` 重新產生精簡公開檔案。來源驗證失敗時保留上一版公開快照。歷史服務與地理邊界限制請見來源稽核。

## 公車路網與公布服務查核

獨立的「公車路網與服務」分頁整理臺北公運處官方主路線、支線、方向站次與公布服務文件。證據缺口優先及主路線平衡情境分配的是調查名額，不是服務短缺、需求、公平或乘客傷害評分。沒有方向的班表只保留在支線層次；實際歷史可靠度需另行通過營運來源與完整性資格。

進入分頁才載入公車索引，選路線後才取詳情並快取。以 `npm run data:fetch:bus-service` 重用保留來源，`npm run data:audit:bus-service` 驗證，`npm run data:build:bus-service` 重建。明確加上 `-- --refresh` 才重新擷取有限的新版本。訪客不傳憑證或觸發即時車輛請求，本功能未新增相依套件。

請見[繁中 MVP](docs/bus-service-decision-mvp.zh-TW.md)、[來源稽核](docs/bus-service-source-audit.md)、[方法論](docs/bus-service-methodology.md)及[交付證據](docs/bus-service-delivery.md)，查閱實際數量、資格、情境、截圖及未驗證事項。

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
