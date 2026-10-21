# Session Handoff

## Attachment follow-up — 2026-10-21

PR #7 remains the single review PR. The new complete handoff is `docs/neihu-congestion-delivery.md`, with `docs/neihu-congestion-decision-mvp.zh-TW.md` (18 required sections), `docs/neihu-congestion-methodology.md`, existing source audit, and intentional screenshots under `docs/images/`.

Follow-up fixes geographic wording in exports to preserve unverified study scope; one regression added. Latest test total is **66 / 4 files**. npm ci, root/Pages build, final init.sh, Pages integration 5/5, audit/reproducible builds, real production JSON/CSV, desktop/mobile and bilingual checks passed. Retained source/snapshot bytes are unchanged. No fresh API/historical acquisition, legacy accident conversion, dependencies or Portfolio changes. Review report's 22-item matrix; historical performance is still gated, with 0 eligible candidates. Prior entries below are preserved history.

## Current handoff — 2026-10-21

Review PR: https://github.com/LEO0331/taipei-crash-map/pull/7 (not merged). Exact original-byte retention is enforced by `.gitattributes`; staged Git hashes were checked against all six manifest entries. Production JSON and CSV downloads both passed.

feat-006 is implemented on `codex/neihu-congestion-decision-support`; prepare/review one PR without automatic merge. The latest source of truth is the 2026-10-21 section of progress.md and docs/neihu-congestion-source-audit.md. Sections below this handoff are historical.

The new independent bilingual module publishes a 58-device research inventory and quality-review scenarios. All geographic scopes remain unverified, 27 devices retain ambiguous direction/link mapping, and no operational/synthetic observation rows are public. Historical comparison is disabled: stale VD timestamps, unverified road-speed crosswalk, empty travel-time/pairing feeds and no authenticated TDX archive. Do not enable historical mode from a catalogue pointer or isolated snapshot.

Regenerate with `npm run data:fetch:neihu-traffic` (retained edition; explicit `-- --refresh` for new bounded acquisition), `npm run data:audit:neihu-traffic`, then `npm run data:build:neihu-traffic`. Hash/schema failures preserve the published snapshot. Never run legacy accident conversion as a side effect. Credentials stay outside Git and browser assets.

Final init.sh: 65 tests / 4 files, build passed. Git Bash works where default WSL Bash does not. GitHub Pages build/base-path integration, desktop/mobile, bilingual filters, capacity changes, guards, and actual JSON download verified. See progress.md for measurements and changed files. Existing dependency audit has 8 vulnerabilities (3 moderate, 5 high); existing large PWA precache is unchanged. Follow up in separately scoped work.

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
