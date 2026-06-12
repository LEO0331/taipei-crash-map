# Session Handoff

## Current Objective

- Goal: Keep the Taipei crash map repo reviewable, verified, and ready for commit.
- Current status: Harness files created; whole-project code review completed with fixes; verification passed.
- Branch / commit: Check with `git status --short` and `git log --oneline -5`.

## Completed This Session

- [x] Created `AGENTS.md`, `feature_list.json`, `progress.md`, `session-handoff.md`, and `init.sh`.
- [x] Documented project-specific startup, scope, verification, and handoff rules.
- [x] Captured current uncommitted source work separately from harness work.
- [x] Fixed service-worker stale-cache behavior for app updates.
- [x] Fixed nearby geolocation UX and map marker clearing.
- [x] Added link isolation and active-toggle accessibility attributes.

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Harness baseline | `./init.sh` | Passed | `npm run build` succeeded; `npm test` passed 1 file / 8 tests. |
| Service worker syntax | `node --check public/sw.js` | Passed | No syntax errors. |
| Dependency audit | `npm audit --audit-level=high` | Passed | 0 vulnerabilities. |
| Browser smoke | Playwright desktop/mobile checks | Passed | No horizontal overflow; control deck static; dashboard loads. |

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

## Decisions Made

- Use a minimal harness rather than adding docs-heavy process.
- Keep conversion verification separate from default startup because raw CSV input is outside the repo.
- Require browser checks only when UI/map/PWA work changes visible behavior.
- Use network-first service-worker handling for navigation and data JSON so GitHub Pages users can receive updates.

## Blockers / Risks

- `public/data/accidents.json` is about 66 MB; improving first-load data architecture is still a larger future optimization.
- Existing uncommitted changes cover multiple concerns and should be grouped deliberately before commit.

## Next Session Startup

1. Read `AGENTS.md`.
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh` before editing if fresh baseline evidence is needed.

## Recommended Next Step

- Review the combined diff and decide whether to commit harness, UI performance/layout, and code-review fixes separately.
