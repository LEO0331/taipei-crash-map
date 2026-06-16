# Session Handoff

## Current Objective

- Goal: Keep the Taipei crash map repo reviewable, verified, and ready for commit.
- Current status: Heatmap removed; dashboard no longer fetches raw records on first entry; Crash Factors dataset pipeline and tab added; verification passed.
- Branch / commit: Check with `git status --short` and `git log --oneline -5`.

## Completed This Session

- [x] Created `AGENTS.md`, `feature_list.json`, `progress.md`, `session-handoff.md`, and `init.sh`.
- [x] Documented project-specific startup, scope, verification, and handoff rules.
- [x] Captured current uncommitted source work separately from harness work.
- [x] Fixed service-worker stale-cache behavior for app updates.
- [x] Fixed nearby geolocation UX and map marker clearing.
- [x] Added link isolation and active-toggle accessibility attributes.
- [x] Removed avoidable non-null assertions and cleaned parsing/control-flow noise.
- [x] Simplified dashboard fallback markup into a local component.
- [x] Normalized `src/i18n.ts` formatting.
- [x] Added malformed-hour regression coverage.
- [x] Added compact tuple-based `public/data/heatmap-points.json`.
- [x] Updated the converter to generate the heatmap dataset.
- [x] Updated initial app loading to avoid `accidents.json`.
- [x] Verified raw accidents load on demand when switching to cluster mode.
- [x] Restored dashboard loader wrapper to the full map/content grid column.
- [x] Removed heatmap mode and heatmap-only generated data.
- [x] Dashboard now renders from summary/hotspot data before raw records are loaded.
- [x] Added `npm run fetch:crash-details` for Taipei Open Data API pagination.
- [x] Added `npm run convert:crash-details` for raw JSON/CSV conversion.
- [x] Added crash-detail party-level and deduplicated accident-level models.
- [x] Added `事故特徵` / `Crash Factors` tab with filters, summary cards, and aggregate charts.
- [x] Generated crash-detail static JSON from sample resource `83d6d29c-6801-41a2-95c6-47d551646db3`.

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Harness baseline | `./init.sh` | Passed | `npm run build` succeeded; `npm test` passed 1 file / 8 tests. |
| Service worker syntax | `node --check public/sw.js` | Passed | No syntax errors. |
| Dependency audit | `npm audit --audit-level=high` | Passed | 0 vulnerabilities. |
| Browser smoke | Playwright desktop/mobile checks | Passed | No horizontal overflow; control deck static; dashboard loads. |
| Cleanup baseline | `./init.sh` | Passed | Build passed; tests passed 1 file / 9 tests. |
| First-load data | Playwright resource check | Passed | Initial load excluded `accidents.json`; cluster mode requested it on demand. |
| Final baseline | `./init.sh` | Passed | Build passed; tests passed 1 file / 12 tests. |
| Dashboard layout | Playwright desktop measurement | Passed | Map, dashboard slot, and dashboard each measured 994px wide at 1440px viewport. |
| Heatmap removal | Playwright smoke check | Passed | Buttons are `高頻事故地點` and `群聚點位`; no dashboard `Failed to fetch`. |
| Crash-detail fetch | `npm run fetch:crash-details` | Passed | 23 pages / 22,762 rows saved under `data/raw/crash-details`. |
| Crash-detail convert | `npm run convert:crash-details` | Passed | 22,762 party rows, 22,762 deduplicated accidents, 2 coordinate outliers. |
| Crash-detail tests | `npm test` | Passed | 1 file / 14 tests. |
| Crash-detail build | `npm run build` | Passed | Vite emitted lazy `CrashFactorDashboard` chunk. |
| Crash Factors smoke | Playwright desktop/mobile checks | Passed | No `Failed to fetch`, no horizontal overflow, Crash Factors loads 22,762 records. |

## Files Changed

- `AGENTS.md`
- `feature_list.json`
- `progress.md`
- `session-handoff.md`
- `init.sh`
- `public/sw.js`
- `src/App.tsx`
- `src/components/AccidentPopup.tsx`
- `src/components/FilterPanel.tsx`
- `src/components/HotspotLayer.tsx`
- `src/components/HotspotRankingTable.tsx`
- `src/components/LanguageToggle.tsx`
- `src/components/MapModeToggle.tsx`
- `src/components/NearbyHistoricalAccidents.tsx`
- `src/i18n.ts`
- `src/styles.css`
- `src/main.tsx`
- `src/utils/accidents.ts`
- `tests/accidents.test.ts`
- `README.md`
- `scripts/convertAccidents.ts`
- `src/components/AccidentHeatmapLayer.tsx`
- `src/components/AccidentMap.tsx`
- `src/hooks/useAccidentData.ts`
- `src/types/accident.ts`
- `public/data/heatmap-points.json`
- `src/components/AccidentHeatmapLayer.tsx`
- `package.json`
- `data/raw/crash-details/*`
- `public/data/crash-detail-party-records.json`
- `public/data/crash-detail-accidents.json`
- `public/data/crash-detail-summary.json`
- `public/data/crash-factor-summary.json`
- `public/data/crash-detail-conversion-report.json`
- `scripts/fetchCrashDetailData.ts`
- `scripts/convertCrashDetailData.ts`
- `src/components/CrashFactorDashboard.tsx`
- `src/hooks/useCrashDetailData.ts`
- `src/utils/crashDetails.ts`

## Decisions Made

- Use a minimal harness rather than adding docs-heavy process.
- Keep conversion verification separate from default startup because raw CSV input is outside the repo.
- Require browser checks only when UI/map/PWA work changes visible behavior.
- Use network-first service-worker handling for navigation and data JSON so GitHub Pages users can receive updates.
- Avoid broad cleanup rewrites; keep behavior protected by focused tests and `./init.sh`.
- Keep full raw accident records lazy; do not reintroduce dashboard auto-fetching of `accidents.json` on first entry.
- Keep crash-detail data offline/static; the browser must not call Taipei Open Data directly.
- Treat crash-detail party rows as involved-party records and only show person-level fields in aggregate charts.

## Blockers / Risks

- `public/data/accidents.json` remains about 66 MB, but is now an on-demand detail dataset.
- `public/data/heatmap-points.json` has been removed with the heatmap feature.
- Crash-detail generated JSON is large: `crash-detail-party-records.json` ~28 MB and `crash-detail-accidents.json` ~19 MB before compression.
- Current cleanup diff is bounded, but prior project history includes UI/review work; group commits deliberately.

## Next Session Startup

1. Read `AGENTS.md`.
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh` before editing if fresh baseline evidence is needed.

## Recommended Next Step

- Review the heatmap-removal plus crash-detail diff and prepare a commit with verification evidence.
