# Neihu congestion decision-support delivery

Attachment acceptance audit: 2026-10-21, Asia/Taipei. [PR #7](https://github.com/LEO0331/taipei-crash-map/pull/7) is open and not merged. Branch: `codex/neihu-congestion-decision-support`. This follow-up completes the documentation requested after the initial implementation; it does not claim that historical observations became available.

Documents: [繁中 MVP, all 18 required sections](neihu-congestion-decision-mvp.zh-TW.md), [methodology](neihu-congestion-methodology.md), [official source audit](neihu-congestion-source-audit.md), [implementation plan](neihu-congestion-implementation-plan.md).

## Source feasibility and actual capabilities

**Historical-performance no-go; observation-quality mode available.** The public snapshot is `neihu-readiness-49f28aaa55758ffe`. Six official resources were acquired at 2026-10-21T01:43:12.243Z–01:43:13.322Z; original bytes total 1,710,095. The attachment follow-up reuses this retained edition rather than silently replacing it with a new current snapshot. Its fetch command reports checkpoint reuse, not successful fresh ingestion.

Implemented: independent bilingual lazy tab; detector point inventory/map; provenance, editions, source freshness and quality exclusions; filters; separate pure performance/quality engines; deterministic capacities; evidence-scope sensitivity; JSON/CSV briefing with formula protection; static publication with last-good preservation on validation failure. Production historical controls are disabled. Browser-facing decision snapshots contain no synthetic or operational observation rows; original official payloads remain in the repository for source audit. No road heatmaps, inferred journey times, backend, live monitoring or accident-derived congestion score.

### Official datasets actually retained

| Source | Official dataset ID | Actual endpoint / use |
| --- | --- | --- |
| A VD static | `47cb9090-e1c9-4b1d-b299-b11c375c5ee2` | `https://tcgbusfs.blob.core.windows.net/blobtisv/VD.xml`; limited to equipment inventory |
| B VD dynamic | `e57afe7f-3c9e-4f31-9208-eed859a92600` | `https://tcgbusfs.blob.core.windows.net/blobtisv/GetVDDATA.xml`; retained audit only, stale/ambiguous timestamps |
| C road speed | `b5aaf33a-a6dc-4836-bce6-09986241fe11` | `https://tcgbusfs.blob.core.windows.net/blobtisv/GetVD.xml.gz`; one unaccepted operational snapshot |
| D road sections | `e3aa9aa3-6e77-4537-8b7a-4a41908b2089` | `https://tcgbusfs.blob.core.windows.net/blobtisv/Section.xml`; metadata, no accepted VD/Section crosswalk |
| E travel time | `6ccdeddb-c66a-4cf5-8742-46c322f01b3b` | `https://tcgbusfs.blob.core.windows.net/blobtisv/ETagPairLive.xml`; empty/stale, excluded |
| F pairing | `9a5139ca-f3fe-494e-a737-5f761c037f37` | `https://tcgbusfs.blob.core.windows.net/blobtisv/ETagPair.xml`; empty/stale, excluded |

All A–F retained HTTP responses were 200 without credentials. They are public official resources; attribution/license and exact original hashes/encoding are in the source audit and raw manifest. TDX was evaluated, not acquired: the referenced Swagger initially yielded a JavaScript shell; an alternate current official traffic Swagger was reviewed. Current account-specific historical endpoints, Taipei coverage, filters, quotas and subscriptions remain unverified. If later supported, `TDX_CLIENT_ID` / `TDX_CLIENT_SECRET` belong only in offline environment variables; the current fetcher does not implement a TDX OAuth/history client or require secrets. The initial audit recorded 20 daily guest basic requests; this is not a verified historical-member quota and must not be used to size archive collection.

The follow-up could reopen the Taipei catalogue and DOT policy background; TUIC still returned 502 and the TDX homepage rendered no usable documentation text through web retrieval. This does not prove TDX history absent. No authenticated call, quota bypass, bulk archive download or new source edition was attempted.

## Detector identity, geography, periods and completeness

| Evidence | Actual retained result |
| --- | --- |
| Citywide A device rows | 604 metadata rows |
| Research inventory | 58 devices, seven named corridors |
| Single official link/direction | 31 devices, **31 distinct LinkIDs** |
| Ambiguous multi-link/direction | 27 devices, mapping kept null |
| Scoped invalid coordinates | 0 |
| Verified study-boundary / functional connecting-corridor membership | **0**; all 58 scopes unverified |
| Geographic road-name counts | Ruiguang 4; Gangqian 2; Tiding 12; Jiuzong 3; Minquan East 13; Chenggong 6; Huandong 18 |
| B raw timestamps | `2024/11/14T16:46:02`, offset absent |
| B raw population | 724 devices, 2,195 lane records; 89 zero-speed rows; 0 duplicate device IDs |
| C raw population | 612 sections, one timestamp `2026/10/21T09:43:03`, offset absent |
| D raw population | 818 section metadata rows |
| E/F | 0 observations / 0 pairing rows, stale 2024-12-18 editions |
| Accepted operational period | `observedFrom=null`, `observedThrough=null` |
| Accepted samples / daily aggregates / days | 0 / 0 / 0 |
| Expected sampling cadence / intervals | Unknown (`null`) |
| Missing intervals/days, downtime, outages, interval duplicates | Unknown (`null`), not measured zeros |
| Accepted historical completeness | Unknown (`null`); no fabricated 0% coverage |
| Flow/occupancy/sentinel/holiday definitions | Not accepted or unverified |

The 31 link mappings certify only what A explicitly publishes for those devices. They do not certify Neihu Technology Park study coverage, identity continuity with B, or D road-section relationships. Source update and acquisition times are not a traffic observation period. The public snapshot's excluded count 2,195 refers to B's retained lane records, not missing intervals in a complete historical cohort.

## Actual review candidates and capacity examples

Fixed scope: all seven research corridors, all directions retained separately, all retained source editions, no accepted historical dates, default 80%/20% assumptions, quality objective. There are **58 quality-eligible candidates**: urgent 27 and review 31. There are **0 traffic-performance-eligible candidates**.

| Strategy / capacity | Eligible | Excluded from objective | Selected | Represented corridors |
| --- | --- | --- | --- | --- |
| Observation quality / 5 | 58 | 0 | 5 | 3 |
| Observation quality / 10 | 58 | 0 | 10 | 5 |
| Repeated slowdown / 5 or 10 | 0 | 58 | 0 | 0 |
| Balanced performance / 5 or 10 | 0 | 58 | 0 | 0 |

The actual quality ordering is below. All ten selected devices have unresolved link/direction; their null values are the reason to investigate, not an implied direction-specific speed measurement.

| Order | Device | Corridor | Capacity 5 | Capacity 10 |
| --- | --- | --- | --- | --- |
| 1 | `VQ6WK40` | Chenggong | Selected | Selected |
| 2 | `VQKWL40` | Chenggong | Selected | Selected |
| 3 | `VRHT660` | Gangqian | Selected | Selected |
| 4 | `VSKTL00` | Gangqian | Selected | Selected |
| 5 | `V6140C0` | Huandong | Selected | Selected |
| 6 | `V6151C0` | Huandong | — | Selected |
| 7 | `V6171C0` | Huandong | — | Selected |
| 8 | `VPBTD70` | Jiuzong | — | Selected |
| 9 | `VQRTE00` | Jiuzong | — | Selected |
| 10 | `VNUNJ20` | Minquan East | — | Selected |

Quality sorting follows urgency, evidence flags, available invalid/completeness ratios, then stable corridor/candidate IDs. Traffic performance uses independent A/B/C/insufficient tiers. Balanced selection is deterministic corridor round-robin within eligible performance candidates. Full rules, ties, nulls and assumptions are in the methodology document. Capacity differences are investigation allocations, not traffic improvement. Source/day/device/window/threshold changes are different evidence scopes; quality and performance are different objectives. Engine tests exercise temporal aggregation/sensitivity with synthetic fixtures, not actual official time series.

## Verification commands and outcomes

Executed again during this attachment follow-up on 2026-10-21:

| Check | Actual outcome |
| --- | --- |
| `npm ci` | Passed; lockfile and dependency declarations unchanged; existing audit 8 vulnerabilities (3 moderate, 5 high) |
| Baseline `./init.sh` via installed Git Bash | Passed, 65 tests / 4 files before follow-up fix |
| `npm run data:fetch:neihu-traffic` | Passed checkpoint reuse; no new HTTP acquisition |
| `npm run data:audit:neihu-traffic` | Passed identity, original-byte hashes and source schema audit |
| `npm run data:build:neihu-traffic` twice | Passed; both SHA256 `e54b852d17388683eddc16b46c930178451df4af78a4802663eaef579ccf3441` |
| `npm test` | Passed **66 tests / 4 files**, including new export-geography regression |
| `npm run build` | Passed TypeScript + Vite |
| Final `./init.sh` via installed Git Bash | Passed build and **66 tests / 4 files** |
| `GITHUB_PAGES=true npm run build` | Passed, `/taipei-crash-map/` base |
| `GITHUB_PAGES=true npx vitest run tests/trafficCongestionIntegration.test.ts` | Passed **5 integration tests** |
| `node --check public/sw.js` | Passed |
| `git diff --check` and staged whitespace check | Passed before publishing follow-up |

PowerShell used `$env:GITHUB_PAGES='true'` for the POSIX environment assignment. Default WSL Bash was unavailable in the initial run; installed Git Bash is supported and completed the harness. No lint command is configured; TypeScript is the repository static check. `convert:accidents` was deliberately not run. Scoped conversion is invoked by the traffic audit/build scripts. No new dependencies or Portfolio changes.

### Test evidence and limits

Source tests cover metadata and dynamic schemas, pointer detection, version drift, timestamps, geometry, ambiguous identity, invalid/zero values, original hash/edition mismatch, path traversal, XML entities, authentication failure, rate-limit handling and body bounds. Engine tests cover same-device/lane/edition references, missing days, duplicates, invalid references, thresholds, A/B/C/insufficient, deterministic capacities/balancing, independent quality objectives, scope warnings, synthetic rejection and CSV safety. Integration tests cover loading/error/retry, bilingual safeguards, filters, exports, base paths, lazy fetch and cached remount.

These tests establish software behavior, not source engineering validity. Current sources have no accepted flow conversion, travel-time pairing or complete historical population. There is no claimed unit-conversion or real-history integration result. Existing accident utilities still pass. Map rendering is checked in a real browser rather than simulated by the integration tests.

## Browser observations and screenshots

Follow-up production preview: `http://127.0.0.1:4176/taipei-crash-map/` with a Pages-configured build. Existing crash map loaded 167,550-record summary and hotspot controls. The new tab loaded independently with explicit insufficient-history messaging. Desktop document width/scroll width **1265/1265 px**; mobile **375/375 px** inside a requested 390×844 viewport (scrollbar reduces content width). No document horizontal overflow. Tables/navigation scroll inside their intended containers.

Traditional Chinese readiness state and English mobile capacity-10 briefing were inspected. Real browser JSON/CSV downloads both completed. Download inspection confirmed snapshot identity, **10 selected / 58 eligible** quality candidates, six source hashes, `performanceIndicatorsAvailable=false`, and amended geographic text stating the study scope may be unverified. The regression fix removes the earlier export phrase that overstated verified connecting-corridor coverage.

These two screenshots are intentionally retained as delivery evidence; other temporary browser output/downloads are not committed:

![Desktop readiness view](images/neihu-congestion-desktop.jpg)

![Mobile readiness view](images/neihu-congestion-mobile.jpg)

Prior implementation checks also exercised corridor filtering and 5/10 slots. Lazy-loading/base-path assertions were rerun in integration tests. Service-worker source is unchanged and syntax passes; a complete offline cache lifecycle and PWA installation on physical devices were **not** repeated. Existing full crash-factor/violation/appraisal datasets were not all manually navigated in this follow-up; their code is unchanged. No dedicated E2E script or new browser-testing dependency is claimed.

## Performance measurements

| Measurement | Follow-up result / interpretation |
| --- | --- |
| Public snapshot | 120,789 bytes, unchanged |
| Source-health / quality report | 4,137 / 4,888 bytes |
| Lazy congestion JS | 51.90 kB raw / **17.49 kB gzip** after export-wording fix |
| Lazy congestion CSS | 3.38 kB raw / 1.04 kB gzip |
| Local quality scenario | 58 candidates, capacity 10, 10,000 Node iterations: mean **0.0105 ms** |
| Local production snapshot HTTP read + parse | HTTP 200, correct snapshot, **34.1 ms** for one request |

The 37.5 ms / 17.44 kB figures in the historical progress entry refer to the earlier build. Both sets are observations, not public-host latency or throughput guarantees. Browser full interaction latency under mobile network and large future history were not benchmarked. The browser never downloads the retained citywide raw XML history for this module; only compact static artifacts are used. Initial crash-map loading does not fetch congestion JSON.

## Attachment definition-of-done cross-check

| Item | Evidence / status |
| --- | --- |
| 1 Existing crash map functional | Production browser summary/map controls; existing utility tests pass |
| 2 New tab integrated | Lazy navigation and real browser |
| 3 Official sources audited | Source audit A–G, six retained originals |
| 4 Metadata distinct from observations | Static inventory, empty public observations, source tests |
| 5 Explicit period on performance results | None published; null accepted period and disabled history |
| 6 Detectors/directions identified | 31 explicit single-link mappings; 27 unresolved, no fabricated joins |
| 7 Completeness assessed | Unknown fields explicit; missing/duplicate/grid tests |
| 8 Comparable metrics only when valid | Production unavailable; pure engine guarded and fixture-tested |
| 9 Explainable shortlist if evidence sufficient | Historical gate not met; engine implemented, no claimed real performance shortlist |
| 10 Useful quality fallback | 58 candidates, urgency/reasons preserved |
| 11 Capacities 5/10 | Actual 5/3-corridor and 10/5-corridor quality results |
| 12 No fictional historical ranking | Empty historical arrays, excluded sources, disabled controls |
| 13 Fixed vs changed evidence scope | Scope comparison tests and UI warnings |
| 14 Accidents not proxies | Separate models/engine; no accident scoring input |
| 15 Metadata-preserving JSON/CSV | Integration, formula tests and real downloads |
| 16 Chinese/English | Integration plus real Chinese/English production browser |
| 17 Desktop/mobile | New delivery screenshots and measured overflow checks |
| 18 Lazy/PWA preserved | Lazy integration tests; service-worker unchanged/syntax checked; full offline install not repeated |
| 19 Source/decision/build/regression checks | 66 tests, both builds, source regeneration and harness |
| 20 Documentation complete | Required MVP/methodology/audit/delivery plus updated README/tracking/handoff |
| 21 Only this repository changed | Scoped Git diff; no Portfolio or other repository edits |
| 22 Reviewable PR | Existing PR #7 updated, no extra PR and no automatic merge |

## Changed files in this follow-up and remaining limitations

Added the three missing required documents and two intentional screenshots. Updated source audit cross-links, bilingual README, `feature_list.json`, `progress.md`, and `session-handoff.md`, preserving previous evidence. Corrected one geographic export sentence in `src/utils/trafficCongestionScenarios.ts` and added a regression in `tests/trafficCongestion.test.ts`. Existing static outputs regenerate identically; no manual public data edits, source refresh, dependency changes or UI layout changes.

Main blockers to performance evidence remain historical source access, explicit timestamp/cadence/unit semantics, validated study geography and device identity continuity. Next acquire a bounded, licensed, comparable period and official crosswalk/holiday calendar; audit a new edition before enabling comparison. Engineering causation and intervention benefits require separate study. Existing dependency vulnerabilities and large crash-detail PWA precache remain separately scoped risks. This delivery supports evidence review, not operational traffic control or a certified congestion ranking.
