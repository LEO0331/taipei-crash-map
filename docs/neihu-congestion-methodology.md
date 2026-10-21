# Neihu traffic review methodology

Method: `neihu-traffic-observation-review-v1`. Configuration/schema: `1.0.0`. Audited edition: `neihu-readiness-49f28aaa55758ffe`, acquired 2026-10-21. See [source audit](neihu-congestion-source-audit.md) and [delivery evidence](neihu-congestion-delivery.md).

## Candidate identity and observation source

Keep quality and performance objectives independent. A readiness candidate ID serializes `[deviceId, metadataVersion, direction, "readiness"]`. Its `timeWindow: "morning"` is an internal selection placeholder, not an observed morning period; the UI labels equipment/source review without historical windows. A performance ID serializes the device and a group key of source, resource edition, metadata edition, link, direction, lane identity/class and time window. Different editions/directions/lanes never collapse into one candidate.

The public edition uses official Taipei static VD metadata (A) for inventory. B–F retained bytes establish source health and exclusions, not accepted performance observations. TDX (G) was audited for access feasibility but no authenticated historical dataset was acquired. The snapshot contains no operational observations or daily aggregates. Synthetic fixtures reside only in tests. Original catalogue pointers are not observation records.

## Detector/link mapping and geography

Only an exactly published single A `DetectionLink` establishes the displayed LinkID and RoadDirection. There are 31 single-link devices/31 distinct links; 27 multi-link devices preserve null mapping. Do not strip `L_` from section IDs, join by proximity, or assign a device to all lanes on a named road. Exact RoadName prefixes create the seven-road **research inventory**, not a verified functional commute boundary.

All 58 device geographic scopes are `unverified`. They may receive quality-review slots but cannot qualify for performance review. Official coordinates support points only; there is no accepted section geometry or authoritative park/district crosswalk in this edition.

## Direction and normalization rules

Preserve official direction codes; reject observation/device direction mismatch and metadata-edition mismatch. An unknown direction remains unknown. Keep source and resource versions, link, metadata version and lane identity/class with each record. The normalized contract uses speed km/h, interval vehicle counts and occupancy percent, but no retained operational source has accepted units/sentinel semantics. Range validation alone does not establish correct source units.

The engine rejects invalid speed (non-finite, missing, negative or over 200 km/h), negative/non-finite count, occupancy outside 0–100, invalid timestamp, unknown lane and invalid cadence. Zero is not globally missing: a future adapter must apply documented source-specific semantics first. No current adapter claims to convert an official volume unit, weight different sensors or derive travel time. Source B's `TimeInterval=5` remains uninterpreted. Static refresh intervals are not observation cadence.

## Time windows and reference-speed semantics

Require explicit `Z` or UTC offset, then evaluate Asia/Taipei (UTC+08:00). Validate dates rather than accepting normalized impossible calendar dates. Half-open analyst windows:

| Window | Taipei hours | Expected samples, if cadence is verified |
| --- | --- | --- |
| Morning | `[07:00,10:00)` | `10800 / intervalSeconds` |
| Evening | `[17:00,20:00)` | `10800 / intervalSeconds` |
| Off-peak reference | `[10:00,16:00)` | `21600 / intervalSeconds` |

The engine currently supports positive integer cadence dividing an hour and aligned interval timestamps. Another official sampling specification requires an explicit adapter/method review; do not force it into this grid. Requested dates are retained, including entirely absent days for an observed identity group. If a device has no rows at all, readiness conveys absent history rather than generating a fictitious schedule.

Compute daily median peak speed and same-day median off-peak speed for exactly the same device/link/direction/source/resource/metadata/lane identity/class. Both windows must pass completeness. A reference must be finite and positive. Relative slowdown is `(reference - peak) / reference`; retain negative values. This is an observed off-peak reference, not free-flow speed, level of service, capacity ratio or vehicle/person delay. No point-speed to corridor-time transformation is supported.

Weekday means Monday–Friday, not an authenticated ordinary-workday calendar. The UI separates weekday/weekend/all populations; the A tier specifically counts eligible weekdays. No holiday-adjusted conclusions are published.

## Completeness and missing data

`completenessRatio = valid unique samples / expected samples`. Count received, invalid, duplicate and missing records separately. A duplicated timestamp invalidates the entire slot; repeated records do not count as multiple valid samples. Invalid/off-grid rows do not fill expected slots. Missing values stay null, never zero vehicles or zero speed.

Peak and reference completeness are reevaluated under the current threshold, including stricter and more permissive sensitivity. The candidate-level peak completeness also uses total valid / total expected across the selected date population, including incomplete windows. Expected historical counts, missing intervals, downtime and outages are unknown for the production edition; quality completeness/invalid ratios remain null. Accepted historical days and samples are zero.

## Priority thresholds and explanations

Defaults are POC screening assumptions: completeness 0.8; slowdown 0.2; A minimum weekdays 5 and repetition days 3. They are not official grades.

| Performance tier | Rule after source/identity/geography/completeness checks |
| --- | --- |
| Insufficient | Fewer than two distinct comparable dates, missing direction, unverified study scope, or failing overall completeness |
| A | At least five eligible weekdays, at least three qualifying slowdown weekdays, and weekday median relative slowdown at or above configured threshold |
| B | Eligible and at least two distinct repeated slowdown dates, but A not met |
| C | Eligible without an A/B pattern |

For performance sorting, use tier A/B/C, descending repeated-day frequency, descending median slowdown, descending completeness, stable segment-or-device identity, direction, corridor ID, candidate ID. Null performance values use a missing-value fallback and cannot create eligibility. No random tie break.

Readiness quality tiers: missing direction, mismatched or invalid identity flags trigger `urgent`; other unresolved evidence is `review`; fully ready candidates are not selected for quality work. Current counts: urgent 27, review 31, ready 0. Historical quality candidates with flags are review; without flags are ready. Sort quality by tier, descending flag count, descending invalid ratio, ascending completeness, corridor ID and candidate ID. Unknown ratios use an explicit internal ordering fallback, not an asserted numeric measurement. The number of flags is a transparent screening heuristic, not an official measure of corridor importance. Export flags/explanations and limitations with each candidate.

## Capacity and selection strategies

Capacity must be a positive safe integer or null for unlimited. Apply corridor/direction/window filters, form objective-specific eligible/excluded populations, sort deterministically and take at most capacity candidates. Quality considers unresolved-quality candidates independently of their performance `eligible:false` flag. The excluded-only UI view produces no selected shortlist.

- Repeated slowdown first: sorted eligible performance candidates.
- Balanced corridor review: sort corridor IDs, then take one within-corridor-ranked candidate per corridor per round until capacity is filled. This can favor an earlier stable ID when capacity is less than corridor count; it is deterministic review diversity, not an optimal transport intervention.
- Observation quality first: sorted unresolved evidence gaps. It remains available without history and is not comparable to the other strategies as a congestion outcome.

Current quality capacity 5 selects 5 of 58 and represents 3 corridors; capacity 10 selects 10 and represents 5. Both performance strategies select 0 and exclude 58. These are actual snapshot computations; see the delivery report for IDs.

## Sensitivity and evidence scope

A fixed-scope comparison holds constant source editions, accepted dates, devices, direction/link identities, time window, population, completeness, slowdown threshold and reference definition. Canonicalize set-like lists before comparison. Capacity or strategy may differ at fixed scope. If any evidence field differs, return a different-evidence-scope warning; a different objective returns a separate warning. Compare selection sets by stable candidate IDs and explicitly report identical sets.

The UI offers 5/10 capacity and source-edition inclusion. The engine supports 90% completeness, 30% slowdown, morning/evening and balanced/slowdown comparisons, tested using synthetic history. Production has no accepted history, so those performance comparisons cannot produce measured outcomes. Source toggles filter the accepted edition population; selecting an excluded source never grants performance eligibility.

## Publication, export safety and reproducibility

The typed contract validates schema/method/config versions, source hash consistency and rejects nested synthetic markers. Nonhistorical modes cannot publish eligible performance candidates. Historical mode additionally requires accepted periods, verified source provenance, aggregate count/completeness checks and reproducible eligible candidates. This guard complements offline source review; it does not prove a publisher's arbitrary numeric payload authentic merely because it is well typed.

JSON/CSV briefings retain snapshot identity, source metadata/hashes, period, scope, thresholds, capacity, selections/exclusions, comparison, questions and limitations. Unknown indicators stay unavailable. CSV quotes every field, doubles quotes and neutralizes formula prefixes (including leading whitespace/control characters). Geographic text identifies research scope as potentially unverified; it cannot certify a functional corridor relationship.

From repository root:

```sh
npm ci
npm run data:fetch:neihu-traffic
npm run data:audit:neihu-traffic
npm run data:build:neihu-traffic
npm run data:build:neihu-traffic
npm test
npm run build
GITHUB_PAGES=true npm run build
git diff --check
./init.sh
```

The default fetch reuses retained acquisition, not a new live request. `npm run data:fetch:neihu-traffic -- --refresh` deliberately requests one bounded new edition; review its identities/schema before publishing. Conversion is imported by audit/build, not a standalone partial-publication command. Do not run `convert:accidents` for congestion work.

Check every original against `data/raw/neihu-congestion/manifest.json`. `.gitattributes` disables newline conversion for retained traffic bytes. Two rebuilds of the retained edition must yield snapshot SHA256 `e54b852d17388683eddc16b46c930178451df4af78a4802663eaef579ccf3441`. Generated time comes from acquisition metadata; analytical identity comes from retained source hashes, not the browser clock. Raw-source or schema failures prevent replacement of the last good snapshot. The bounded fetch allows 4 MiB/body, 20-second request timeout and one bounded Retry-After retry; longer waits defer to another manual acquisition. No uncontrolled recurring requests or browser API credentials.

PowerShell equivalent: `$env:GITHUB_PAGES='true'; npm run build; Remove-Item Env:GITHUB_PAGES`. Use installed Git Bash for `./init.sh` where default WSL Bash is unavailable. No new packages are required.
