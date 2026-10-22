# Bus network and published-service methodology

Method: `bus-network-service-evidence-review-v1`; schema: `1.0.0`.

This method prioritizes investigations of source relationships and published documentation. A tier is not a shortage, demand, harm, reliability or bus-service quality score. Acquisition and source audit precede this method; see [source audit](bus-service-source-audit.md).

## Population and identity

The production population is the verified PTO native v6.3 network. Identity uses source namespace, main route ID, subsidiary `PathAttributeId`, and stop-derived direction. Display names are labels only. Operator IDs remain arrays rather than creating duplicate investigation units. The 800 Route rows contain 773 distinct main-route/variant/operator associations and 27 repeated associations; 731 variants and 416 main routes remain distinct. These repeated associations are not automatically invalid variants.

Candidate IDs are encoded composite identifiers: `pto:<main>:<variant>:<direction>`. A route-specific stop post is distinct from its physical StopLocation. PathDetail occurrence IDs and sequence numbers remain intact, including repeated visits on circular services. PathDetail.Type is not a direction field. Direction derives from the referenced Stop.goBack; unknown direction remains explicit.

The source has cross-border stops. Network scope does not establish Taipei-only municipal coverage, administrative districts, pedestrian access, demand, population denominators or district diversity. Exact subsidiary/direction geometry is distinguished from main-route shapes; missing exact geometry does not authorize manufactured lines.

## Three independent eligibility objectives

1. **Network/documentation quality:** Requires a source reference, verified or limited source status, complete composite identity and network geographic scope. Strict mode excludes unknown/ambiguous identity. Broader mode admits those units solely for ambiguity investigation; evidence status stays limited. Blocked, unavailable, unverified and out-of-scope records remain excluded.
2. **Published-service comparison:** The acquired SemiTimeTable/TimeTable schedules join the variant but have no verified direction assignment. Consequently all direction candidates are ineligible for this objective. Variant schedules remain inspectable published evidence; none is copied to both directions. Main-route first/last strings remain main-route metadata.
3. **Historical performance:** No production candidate qualifies. Published dispatch times, timetable plans, GPS and estimated arrivals are not actual completed service evidence.

Unknown observations remain unavailable, not zero. Eligibility reasons and unknown measurements travel with every exported candidate.

## Review rules and ordering

The first matching category determines the tier:

| Tier | Exact triggering issue codes |
|---|---|
| A | `missing-stop`, `broken-route-stop`, `route-stop-conflict`, `missing-location`, `invalid-coordinate`, `unknown-direction`, `ambiguous-route`, `duplicate-sequence`, `sequence-gap`, `missing-sequence`, `source-version-mismatch`, `orphan-variant` |
| B | `undirected-schedule`, `schedule-conflict`, `calendar-ambiguity`, `missing-timetable`, `invalid-time`, `inverted-headway` |
| C | Other documentation/monitoring issues, including unavailable exact geometry, or no A/B issue |

A asks for primary source/relationship verification; B asks for clarification of relevant published service documentation; C asks for lower-priority documentation review. Sequence anomalies are questions for the publisher, not proof of passenger harm. No issue-count weighting, service-shortage score or fake differences within an equivalent tier are introduced. Stable ASCII composite-ID order breaks ties reproducibly.

## Capacity, balancing and sensitivity

Capacity is 5, 10 or unlimited (`null`); invalid capacities fail explicitly. Evidence Gaps First sorts all eligible candidates by A/B/C then ID. Balanced Network Review groups that ordered population by verified main route; route groups enter in their best candidate's rank order, then one candidate per route is selected each round. This may choose a lower-tier candidate from an additional route before a second candidate of a previously represented route. It changes investigation representation, not expected benefits.

Reports retain the scoped population, eligible/excluded/selected units, actual capacity used, distinct main routes and variants, geographic caveats and assumptions. Unlimited strategies select the same set even if sequence order differs.

Research controls cover capacity, verified route/variant/direction scope, and inclusion of ambiguous identities. Broader inclusion never verifies an ambiguous join or enables historical/published-direction comparisons. Comparison checks the explicit snapshot edition, filters, objective, inclusion rule and candidate evidence. Missing editions are unknown scope; differing editions or populations cannot be presented as a fair strategy-only comparison. Changed eligible population and selection IDs are reported separately.

## Published-time parsing

Raw source strings are always retained. Times accept `HH:mm` or `HHmm`, including explicit service-day hour offsets through 47:59; invalid formats return null. An end clock earlier than its start moves to the following service day. This is a published-window interpretation in Asia/Taipei, not an observed operating event.

Headways accept an unambiguous positive integer or explicit ordered range such as `10～15分`. Compact `0510`, inverted ranges and natural-language descriptions remain unresolved. The original LongHeadway/LowHeadway fields are not swapped or interpreted as achieved frequency. Native DateType 0 accepts weekday 1=Sunday through 7=Saturday; DateType 1 accepts valid YYYYMMDD special dates. Unsupported encodings and impossible dates remain unresolved. A valid date is not a verified holiday rule or service exception.

## Separately typed historical engine

`HistoricalBusEvidence` and `BusActualObservation` remain separate from inventory types. All eleven gates must explicitly pass: legal official access, verified identity, actual event semantics, accepted timezone, service-day definition, stable crosswalk, comparable windows, duplicate handling, expected-versus-observed completeness, exceptions/holidays and telemetry outage handling. Missing gates fail closed with individual reason keys.

Even after gates pass, events require source/main/variant/direction composite identity, a stop post, a real service date and a valid ISO timestamp with explicit offset or Z. Estimates and vehicle positions reject the analysis. Exact duplicate events are removed; conflicting reuse of an event ID rejects analysis. Accepted actual arrivals or actual departures are grouped separately by candidate, stop, service day and semantics, and consecutive positive intervals are returned. Events on different service days are not pooled. This engine does not infer missed trips, calculate executed-trip totals or assign reliability scores. Its all-gates-passed tests use explicitly synthetic unit fixtures; no fixture enters production results.

## Provenance, validation and exports

The manifest pins immutable artifact paths, byte sizes and SHA-256 digests. The browser validates bytes before parsing. Strict snapshot validation checks exact schema/method versions, counts, route/candidate relationships, required network sources, allowlisted official HTTPS URLs, hashes and acquisition dates. Recursive synthetic/test flags are rejected. A valid checksum proves agreement with the manifest, not an independent publisher signature. Route detail validation remains in the independent data hook.

JSON/CSV briefings include snapshot edition, original source hashes/URLs, scenario settings, filters, sensitivity, selected and excluded real candidates and limitations. CSV cells quote embedded delimiters and neutralize leading spreadsheet formula characters, including whitespace/control prefixes.

## Measured production example

For acquisition edition `pto-bus-0b70f80504e5b952`, the engine evaluated 1,241 units: A=163, B=927, C=151. Strict quality eligibility is 1,241, excluded=0; broader identity inclusion adds 0. This equivalence is displayed rather than inventing a sensitivity effect. Published-direction comparison and historical performance each have 0 eligible candidates.

| Capacity | Evidence gaps: distinct main routes | Balanced: distinct main routes | Changed selection |
|---|---:|---:|---|
| 5 | 2 | 5 | 3 added / 3 removed |
| 10 | 5 | 10 | 5 added / 5 removed |
| Unlimited | 416 | 416 | Identical set of 1,241 |

At capacity 5, Evidence Gaps First selects `pto:10419:104190:0`, `pto:10419:104190:1`, `pto:10432:10432:1`, `pto:10432:157849:1`, `pto:10432:159403:1`. Balanced selects `pto:10419:104190:0`, `pto:10432:10432:1`, `pto:10471:104710:0`, `pto:10724:107240:0`, `pto:10734:107340:0`. These are investigation slots, not recommended service cuts or route investment priorities.

## Verification

`tests/busService.test.ts` checks identity namespaces/directions, raw headway/calendar/overnight parsing, strict/broader eligibility, stable capacity and balancing, scope editions, historical nonactual rejection and duplicates, production schema/hash validation, nested synthetic rejection, actual candidate exports and CSV injection. On 2026-10-22, 15 tests passed; full `tsc -b` passed. Default sandbox TEMP caused a Vitest cache rename EPERM before tests executed; rerunning with TEMP/TMP under the ignored workspace `node_modules/.cache/bus-tests` passed. Full repository/build/browser evidence belongs in the delivery report.
