# Session Handoff

## Current publication status — 2026-11-02

Fetched `origin/main` is `141ff8c` (merge of [cache-isolation PR #14](https://github.com/LEO0331/taipei-crash-map/pull/14)). The cache correction is merged. First-load [PR #13](https://github.com/LEO0331/taipei-crash-map/pull/13) and Civic Explorer [PR #12](https://github.com/LEO0331/taipei-crash-map/pull/12) are also in this main history. Earlier review/open-PR instructions below are historical snapshots, not current tasks. Merge evidence does not establish deployment.

This follow-up is documentation only on `codex/refresh-crash-publication-handoff`, based on that fetched main. Its new Draft PR is the item to review; earlier implementation PRs need no further merge action. Runtime, datasets, dependency files and analytical boundaries remain unchanged.

Current Pages production build: entry JS 418.22 kB / 126.61 kB gzip; shared chart chunk 351.20 kB / 103.78 kB gzip; optional Explorer 5.56 kB / 2.38 kB gzip. These are emitted file sizes, not public-host latency measurements. Charts already load on viewport approach or explicit analysis entry, and secondary data loads on its first tab visit. No additional bundle correction is justified by this documentation follow-up; retain the existing lazy boundaries and measure public cold-mobile loading before choosing further work.

Fresh verification: 127 tests / 13 files, GitHub Pages production build and npm audit (zero vulnerabilities) passed. Existing production Chromium 1440/375 navigation, deferred requests and visited offline checks are recorded with the follow-up evidence. No remote deployment, physical-device installation or other-browser claim. Next: review this documentation Draft PR, then check the published release and real mobile performance separately.

## Historical handoffs

The entries below preserve the state reported in earlier sessions; their branch, PR, vulnerability and next-action statements are historical.



## All four first-load priorities — 2026-11-02

Implemented priorities 3/4 in the same feat-005 first-load scope: viewport-deferred map dashboard (160px margin; direct analysis and unsupported observer load immediately), first-entry secondary-tab JSON with in-flight/results retained. Includes preceding early-basemap and SW v4 changes. Current branch `codex/map-first-load` starts at merged main `96bccb4`; Civic Explorer PR #12 is already merged. User authorized commit and push, never automatic merge. Final init.sh/root/Pages builds and 127 tests/13 files pass; Chromium1440/375 confirms no chart/secondary startup requests, scroll/direct-analysis rendering, secondary datasets fetched once, no overflow/page errors, and controlled-visit offline map/demand cache. New optional scripts/checkFirstLoad.cjs reuses existing Playwright and keeps artifacts ignored. Full evidence/limits in newest progress.md entry. Review pushed branch, then measure public mobile cold load after deployment. Earlier handoffs below retain historical state.

## First-load map handoff — 2026-11-02

Completed a scoped feat-005 bugfix: mount basemap immediately while JSON loads; keep map on data errors; hide unavailable record counts; reduce SW install precache to four map essentials and migrate cache v3 to v4. Detail datasets cache on demand. Cache migration clears old offline resources; revisit screens online to cache them again. No dependencies/generated data changed. Final init.sh, 114 tests/11 files, root/Pages builds, SW syntax and diff checks pass. Pages Chromium 1440/375 checks confirm tile requests before held JSON resolves, stable map identity, hotspots/count, bilingual UI, no overflow/page errors. Fresh install excludes large detail downloads; demand cache works offline; map offline reload passes after a completed worker-controlled online visit. Immediate first-install offline readiness and offline external tiles are not guaranteed. Evidence and limitations in the newest progress.md entry; temporary browser artifacts ignored in .omx. No deployment or commit performed. Next: review/deploy scoped changes, measure public cold mobile loading; optional chart/secondary-tab deferral remains separate.

## Civic Explorer handoff — 2026-11-02

Review [Draft PR #12](https://github.com/LEO0331/taipei-crash-map/pull/12), open/unmerged, attached to this chat. Upstream merged the undici fix during work; branch synchronized with `092b211` in `2c82386`, clean install/harness rerun and final full audit0. The initial1high dev finding described below is resolved by upstream, not a feature dependency edit. Remaining limits are physical-device/other-browser/remote-deployment checks.

Feature feat-008 complete on `codex/civic-explorer`, base `b2253fe`. One Draft PR, manual merge only. See docs/civic-explorer-delivery.md for exact five-hub/eight-tab mapping, MIT attribution, screenshots, baseline/final bundle measurements and regression evidence. init.sh and106tests/9files passed; root/Pages production desktop/mobile, mounted map/filter/mode preservation, research laziness, optional-chunk failure, SW scope and offline visited Explorer passed. Initial JS +2909bytes; optional JS5562/CSS4903bytes. No dependencies, data, analytics, ETL/export or PWA configuration changes. PASS_WITH_LIMITATIONS: existing1high dev undici finding, no physical mobile install/remote deploy/other-browser testing. Next step is human PR review/deployment. Keep earlier handoffs below as historical; PR #9 is now merged in this feature's base.

## Current Policy #5 handoff — 2026-10-22

Completed feature review PR: https://github.com/LEO0331/taipei-crash-map/pull/9 (open, not merged), implementation8a619fd. All430 staged byte hashes were verified against manifests. Final step is human review; do not auto-merge. GitHub connector lacks PR write permission, so the authorized signed-in browser created the PR; the app artifact is attached.

Branch `codex/bus-network-service`, base/main5443ee5815deac968c228fd46954ec148c8e09ed, PR7/8 merged. Feature feat-007 implements bus inventory/documentation review only; full current evidence in docs/bus-service-delivery.md. Preserve all earlier notes below as historical. Publish/review one PR against main; never auto-merge.

Eight retained PTOv6.3 gzip files (2026-10-21 acquisition) support416 main routes/731 variants,1241 quality candidates A163/B927/C151. Unresolved212 variant-reference rows are retained/excluded, not fabricated. Published schedules have no accepted direction and historical actual events are unavailable, so those eligibility modes stay disabled. Capacities5/10/all and main-route balancing work; no district/demand/reliability/shortage claim.

Latest verification: npm ci;99tests/7files; root/Pages builds; final init.sh;11 Pages bus/Neihu integration tests; scoped fetch/audit/build+byte-identical manifests; real production desktop/mobile, parsed/raw schedule, selected-map37points and JSON/CSV downloads. Source/published Git newline conversion is disabled to preserve hashes. npm audit has2 existing moderate findings; full physical-device PWA offline install not repeated. No dependencies, Portfolio edits or legacy accident conversion.

Regenerate only `data:fetch:bus-service` (retained unless explicit --refresh), `data:audit:bus-service`, `data:build:bus-service`. Verify original hashes before publishing a new edition, preserve root manifest on failure, never expose credentials or include fixture/vehicle-tracking histories. See source audit/methodology for ID/calendar and v3/TDX access limits. Intentional screenshots under docs/images/bus-service-*.jpg are delivery evidence, other browser/download artifacts stay out of Git.

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

2026-11-02 audit follow-up: cache activation now removes only old taipei-crash-map-* caches, preserving other applications on the origin. Full 127-test suite, root/Pages builds, audit0 and desktop/mobile Chromium plus real shared-origin cache sentinel check passed. No data/dependency changes. Review Draft PR manually; deployment and physical devices remain unverified.
