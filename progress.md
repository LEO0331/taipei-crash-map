# Session Progress Log

## Current State

**Last Updated:** 2026-06-16 15:30 CST  
**Active Feature:** feat-004 - Accident Data Conversion Integrity

## Status

### What's Done

- [x] Created the minimal harness artifacts with the harness-creator script.
- [x] Customized `AGENTS.md` for the Vite/React/Leaflet/PWA app.
- [x] Replaced placeholder feature entries with project-specific feature state.
- [x] Preserved existing source changes in `src/App.tsx` and `src/styles.css`.
- [x] Ran `./init.sh`; build and tests passed.
- [x] Completed whole-project code review and fixed concrete findings.
- [x] Changed the service worker to network-first for navigation/data requests and cache-first for static assets.
- [x] Fixed nearby geolocation radius persistence, error/status feedback, and marker clearing.
- [x] Added explicit `noopener noreferrer` to external Google Maps links.
- [x] Added `aria-pressed` to language, map mode, and year toggle buttons.
- [x] Ran whole-project anti-slop cleanup pass.
- [x] Removed non-null assertions from accident filtering/hour aggregation.
- [x] Simplified dashboard lazy-load fallback markup.
- [x] Normalized translation file indentation.
- [x] Replaced root DOM non-null assertion with an explicit startup error.
- [x] Added a regression test for malformed out-of-range accident hours.
- [x] Added compact `heatmap-points.json` first-load dataset.
- [x] Changed initial app data loading to fetch summary, hotspots, and heatmap points before full accident records.
- [x] Lazy-loads full `accidents.json` only for cluster mode, search/nearby filters, or dashboard visibility.
- [x] Updated service worker precache to use compact heatmap data instead of full raw accidents.
- [x] Added tests for compact heatmap point building, filtering, and tuple dataset encoding.
- [x] Restored dashboard column sizing after lazy loader wrapper made it appear too narrow.
- [x] Removed heatmap mode, heatmap data generation, and heatmap-only assets.
- [x] Changed default map mode to high-frequency hotspots.
- [x] Stopped dashboard from auto-fetching the full raw accident file on first entry.
- [x] Dashboard now renders initial cards/charts from `accident-summary.json` and hotspots.
- [x] Added offline fetch and conversion scripts for `臺北市死傷交通事故資料`.
- [x] Added `CrashDetailPartyRecord` and deduplicated `CrashDetailAccidentRecord` contracts.
- [x] Generated crash-detail static JSON from Taipei Open Data sample resource `83d6d29c-6801-41a2-95c6-47d551646db3`.
- [x] Added `事故特徵` / `Crash Factors` app tab with aggregate crash detail filters, summary cards, and charts.
- [x] Kept involved-party fields aggregated; no person-level detail is shown in map popups.

### What's In Progress

- [ ] Prepare commit or continue with the next feature.
  - Details: Current heatmap-removal and crash-detail dataset changes are uncommitted.
  - Blockers: None.

### What's Next

1. Review the first-load data diff.
2. Decide whether to commit this separately from cleanup/review work.
3. Continue with the next unfinished feature in `feature_list.json`.

## Blockers / Risks

- [ ] Generated data conversion is not part of the default harness check because it depends on CSV files in `/Users/Leo/Downloads`.
- [ ] Crash-detail public JSON generated from the sample API resource is large: party records ~28 MB and accident records ~19 MB before HTTP compression.
- [ ] UI changes still need browser checks when layout, map, or PWA behavior changes.

## Decisions Made

- **Use `AGENTS.md` as the root instruction file**: Codex and similar coding agents discover it automatically.
- **Keep `./init.sh` focused on build and tests**: These are deterministic and available from the repo without external source CSVs.
- **Track one active feature at a time**: The repo is small enough that heavier multi-agent ownership boundaries would add noise.

## Files Modified This Session

- `AGENTS.md` - Root agent startup and working rules.
- `feature_list.json` - Project-specific feature state.
- `progress.md` - Current status and evidence log.
- `session-handoff.md` - Restartable handoff template/status.
- `init.sh` - Standard verification script.

Existing uncommitted source files before harness work:

- `src/App.tsx` - Lazy-loaded dashboard implementation.
- `src/styles.css` - Responsive layout, heatmap, sticky-filter, and dashboard placeholder styling.

## Evidence of Completion

- [x] Harness verification: `./init.sh` passed on 2026-06-12 17:16 CST.
- [x] Build: `npm run build` succeeded; emitted separate dashboard chunk `Dashboard--FgZ2qW_.js`.
- [x] Tests: `npm test` passed 1 test file / 8 tests.
- [x] Code-review verification: `node --check public/sw.js`, `npm audit --audit-level=high`, `./init.sh`, and Playwright desktop/mobile smoke checks passed on 2026-06-12.
- [x] Cleanup verification: `npm test` after each cleanup pass; final `./init.sh`, `node --check public/sw.js`, and `npm audit --audit-level=high` passed on 2026-06-15.
- [x] First-load data verification: `./init.sh`, `node --check public/sw.js`, `npm audit --audit-level=high`, and Playwright network smoke checks passed on 2026-06-15. Initial data requests included `heatmap-points.json`, `accident-hotspots.json`, and `accident-summary.json`; `accidents.json` loaded only after switching to cluster mode.
- [x] Dashboard layout verification: `npm test`, `npm run build`, and Playwright desktop measurement passed on 2026-06-15. Map, dashboard slot, and dashboard all measured 994px wide at 1440px viewport.
- [x] Heatmap removal verification: `npm test`, `npm run build`, `node --check public/sw.js`, and Playwright smoke check passed on 2026-06-16. Initial map buttons are `高頻事故地點` and `群聚點位`; dashboard has no `Failed to fetch`; initial data requests are only `accident-summary.json` and `accident-hotspots.json`.
- [x] Crash-detail fetch verification: `npm run fetch:crash-details` passed on 2026-06-16; saved 23 pages / 22,762 rows from resource `83d6d29c-6801-41a2-95c6-47d551646db3` into `data/raw/crash-details`.
- [x] Crash-detail conversion verification: `npm run convert:crash-details` passed on 2026-06-16; converted 22,762 party rows, deduplicated 22,762 accident records, reported 0 missing coordinates and 2 coordinate outliers.
- [x] Crash-detail test/build verification: `npm test` passed 1 file / 14 tests and `npm run build` passed on 2026-06-16.
- [x] Crash Factors browser smoke: desktop and mobile checks passed on 2026-06-16. Tabs render as `事故地圖`, `熱點分析`, `事故特徵`, `資料說明`; first entry has no `Failed to fetch`; no horizontal overflow; Crash Factors loads 22,762 accident and 22,762 involved-party records.

## Notes for Next Session

- Split project-facing documentation into an English `README.md` and Traditional Chinese `README-zh.md` on 2026-08-13. Both include reciprocal links and aligned sections for scope, decision limits, data conversion, development, verification, and deployment.

- Added `dashboard-decision-insights-and-technical-notes.md` on 2026-08-13 after a whole-project customer/technical review. It records decision boundaries, customer workflow, data-governance checklist, and prioritised follow-ups for cache size, dashboard controls, lazy loading, freshness, tests, and public-data minimisation.

- Added the separate `Traffic Accident Appraisal Reconsiderations` module on 2026-08-13. It converts the official 12-field monthly CSV from ROC year/month to local static records plus metadata, preserves raw values, and uses no map layer. Verification: `npm run data:convert:appraisal-reconsiderations`, `npm run build`, and `npm test` passed (16 tests).

Start by reading `AGENTS.md`, then check `feature_list.json` and this progress log. The current uncommitted diff removes heatmap mode, keeps the existing hotspot map as default, adds the second crash-detail dataset pipeline, and adds the lazy `事故特徵` / `Crash Factors` tab.
