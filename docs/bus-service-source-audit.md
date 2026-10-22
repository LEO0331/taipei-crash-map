# Policy #5 official source feasibility audit

Audit acquisition: 2026-10-21, Asia/Taipei. Gate recorded before analytical engine implementation. Agency: Taipei Public Transportation Office (PTO). These are published network/schedule inventories, never completed-trip records.

## Gate decision

Mode A is feasible with limitations: official production Route, Stop, StopLocation and PathDetail are successfully retrieved and their identifier semantics verified against API v6.3. Direction-specific sequences can join PathDetail.stopId to Stop.Id, then Stop.routeId to Route.Id and PathDetail.pathAttributeId to Route.pathAttributeId. Route names are never join keys. Timetables join variant only and lack direction; no timetable is duplicated into directions. Mode B is blocked: none of these files provides comparable historical actual arrival/departure events or completeness denominators. Missing evidence never means zero service.

## Contract and evidence

Official documentation: https://pto.gov.taipei/News_Content.aspx?n=A1DF07A86105B6BB&s=55E8ADD164E4F579 ; retrieved PDF v6.3 (2025/09 revision; PTO page updated2025-12-29), https://www-ws.gov.taipei/001/Upload/458/relfile/22545/6554360/5daa0a37-8de7-4455-856b-de14a3b8a327.pdf . PDF retained with original bytes. Contract p7 PathDetail has subsidiary ID, stop post ID, sequence, and type0 normal/CPT control point (not direction); p8 Route.Id main route and pathAttributeId subsidiary; p9 Stop.routeId main route, goBack0outbound/1inbound/2unknown, stopLocationId physical location; p10 DateType0weekday/1special date; TimeTable weekday1Sunday,2Monday,...7Saturday and special yyyymmdd; p13 BusShape.SubRouteID=-1 means main route, GoBack0outbound/1inbound/2loop, WGS84 WKT. Specification and production casing differ; original keys retained.

All eight HTTPS production resources below returned HTTP200 and gzip magic, decoded UTF-8 JSON. Base https://tcgbusfs.blob.core.windows.net/blobbus/ . Envelope files expose EssentialInfo.UpdateTime unzoned raw string, not acquisition time; location states Taipei public bus information center and WGS84. Network includes cross-border stops (e.g. Luzhou), so no district/municipal boundary claims are inferred. Full bytes, SHA256, acquisition and Last-Modified timestamps are retained in machine-readable manifest; compressed originals retained offline, not visitor-fetched.

| Resource | Actual rows | Compressed bytes | Decoded bytes | Classification |
|---|---:|---:|---:|---|
| GetRoute.gz |800|77393|963846|verified network; limited schedule descriptions|
| GetStop.gz |28826|1420511|9402212|verified route stop posts|
| GetStopLocation.gz |5376|179867|920347|verified physical stop locations|
| GetPathDetail.gz |43447|345277|4360660|verified variant occurrences; unresolved references retained|
| GetSemiTimeTable.gz |3280|19759|464002|limited variant-level published headways; no direction|
| GetTimeTable.gz |35465|194850|3943246|limited variant-level departures; no direction|
| GetBusShape.gz |1028|3299688|10336933|limited geometry; main/variant distinction and row age retained|
| GetSpecTimeTable.gz |282|49590|3502458|limited special preplanned schedules; direction mostly literal null|

Verified initial identity counts:800 Route records,416 distinct main IDs,731 distinct variant IDs (42 additional distinct operator associations and27 byte-identical duplicate association records;773 distinct main/variant/operator associations); all28826 Stop.routeId references match main IDs;43447 PathDetail stop references all resolve but212 refer to variants absent from Route. Source update strings2026/10/21 14:42:19–14:46:02; these are raw timezone-unspecified civil timestamps, interpreted only as publisher Taipei context for display, not operational event times. Shape row utime may be years older; feed retrieval does not refresh row geometry.

SemiTimeTable raw LongHeadway12/LowHeadway15 demonstrates naming/value inversion; retain both without asserting bounds. Route peakHeadway may be0510,1520 or natural-language descriptions: no numeric shortage score. TimeTable includes weekday rows; SemiTimeTable also special20250101. Special timetable root updateTime is epoch milliseconds, authorityCodeTPE, timeTableName業者機動預排班表;282 planned route entries, direction values literal null/0. No actual performance claim.

## Licensing and other sources

The [PTO Government Website Open Data Declaration](https://pto.gov.taipei/News_Content.aspx?n=AB37908B5E9D3D00&s=1FE4B2FEF52B0D74&sms=1DD9E1F91DA4D5BC) adopts Government Open Data License1.0 for published data, subject to third-party/private/restricted exceptions. The PTO API v6.3 document publishes the eight exact blob URLs; applying the publisher declaration to these linked official static inventories is an explicit interpretation of that publication chain, corroborated by direct Taipei catalogue licence mappings for Stop and BusShape. No conflicting restriction was found. Attribute Taipei Public Transportation Office, 2026 retained edition, original feed URLs and hashes; derived analyses carry no agency endorsement. [The independent reference audit](bus-service-access-notes.md) records catalogue identifiers, test-versus-production contents, licensing, historical SHP and MRT references, actual TDX OpenAPI hashes, v3 verification limits and2026-10-16 announcement. TDX A2 event semantics are reference-verified, but no authenticated operational data, Taipei historical completeness or crosswalk were acquired; Mode B remains blocked.

## Publication limits

Do not interpret route overlap as inefficiency, dispatch headway as passenger wait, geometry as walking catchment, stop proximity as population coverage, telemetry absence as missed trips, or inventory counts as demand/equity/reliability. No traces, vehicle IDs, credentials or synthetic production rows are published. Offline bounded acquisition and deterministic content-addressed route details keep acquisition independent of visitors.

## Retained production provenance

Offline rebuild authority: `data/raw/bus-service/manifest.json`;8 original gzip bodies total5586935 bytes. All acquisitions HTTP200, API contract `pto-api-v6.3`. Source acquisition date remains2026-10-21 even when rebuilt2026-10-22.

|Feed|Acquisition UTC|Publisher raw update|Original SHA256|
|---|---|---|---|
|Route|2026-10-21T07:08:14.272Z|2026/10/21 14:42:43|`bc280e4f1d06dfbcc807391fcb8e33569331dd9ea93403ca3ea328ab0bfaf6e0`|
|Stop|2026-10-21T07:08:14.742Z|2026/10/21 14:46:02|`5cd22e05d0f5161dd5fe24732f009a75149d06241259982717f1c1e8a0c2c524`|
|StopLocation|2026-10-21T07:08:14.839Z|2026/10/21 14:43:19|`7a652df0da39ac154ba0dccb83ef25e29ed4361368655a9bd4d3d6a8cc9b0b94`|
|PathDetail|2026-10-21T07:08:15.551Z|2026/10/21 14:42:19|`97f2f225ac7d95ba21c601f2cc495d5d323187903eaf6294e572c536484b6600`|
|SemiTimeTable|2026-10-21T07:08:15.622Z|2026/10/21 14:43:07|`a468fb3f3f5682fb1d6f51f0031951dbfc7b713800b53fa61ce0e45cf5e721a9`|
|TimeTable|2026-10-21T07:08:15.768Z|2026/10/21 14:43:31|`8cec0fc5b5400d885259648c1d6204ff60cfe7ec39355d6222f90bc9a22f94fa`|
|BusShape|2026-10-21T07:08:16.591Z|none; inspect per-row utime|`77c13980a8f78b6326048a5c9f19408412ab8dd5a3a897e902d21c750da94636`|
|SpecTimeTable|2026-10-21T07:08:16.679Z|2026-10-20T18:36:01.401Z|`8732cb1a85fd9b4fb0a37c344d3d621c0e4039630c8d48cd37d6c63003337e2b`|

Source schema retains native numeric IDs as namespace-specific strings in normalized output; Stop.routeId matched main IDs for all28,826rows. Route raw primary associations contain27 byte-identical duplicates; operator IDs are deduplicated but original records remain retained. All stop IDs, location IDs, PathDetail IDs and timetable IDs are unique in this edition. Shape coordinates are accepted only as valid WGS84 LINESTRING pairs; exact subsidiary+main+direction mappings qualify subsidiary geometry. Main shapes are retained separately and never treated as subsidiary matches. Sequence continuity checks adjacent numbers within verified variant/direction; no unsupported assumption requires sequence1 at every directional split. Repeated stop visits retain distinct PathDetail occurrence IDs. Invalid coordinates remain null. Broken route-stop relationships are flagged and excluded from mapped verified occurrences.

## Final retained edition and publication verification

Generated from retained inputs on2026-10-22 without regenerating acquisition/generatedAt timestamps. Snapshot `pto-bus-0b70f80504e5b952`:416 main routes,731 subsidiaries,773 distinct operator associations,1,241 variant/direction review units,216 exact subsidiary/main/direction geometry matches. Main-route geometry is separate. Missing variant references212 are retained verbatim in the quality report and excluded from verified candidate inventory. Zero duplicate stop IDs, zero unresolved stop/location/main-route references in Stop, and zero invalid Stop coordinates in this edition. Timetable-direction eligibility0 and historical performance eligibilityfalse.

Root manifest83,384bytes; snapshot563,601bytes;420 referenced JSON artifacts28,239,649bytes total (plus manifest);416 lazily fetched route detail files, minimum6,408bytes, median51,305bytes, maximum673,763bytes (route11138). Original eight compressed sources5,586,935bytes. SHA256 in the root public manifest verifies every byte and size. Old unreferenced generated artifacts and duplicate probe originals were removed after path validation. The official PDF is retained at `data/raw/bus-service/references/api-v6.3.pdf` (628,974bytes, SHA256 `642a0177bb63b990be90a03017d82e8b72a761eab8aac3e0fc1c7ed3614505c4`); exact time was not recorded, so reference manifest records only the known2026-10-21 acquisition date.

Acquisition is explicit/offline and exact-URL allowlisted:30second request timeout, at most3 attempts, bounded exponential backoff500ms/1s plus Retry-After capped5s,16MiB compressed/64MiB decompressed limits, fatal UTF8 decode, envelope/required-field/native-ID/scalar/sequence validation, unique native primary keys. Content-addressed raw and public artifacts use immutable atomic writes; the manifest rename is the full-edition commit point, preserving the previous good edition if any input/schema/fetch/write fails. Rebuilds use retained inputs only; no accident conversion, visitor acquisition, authentication or vehicle trace output occurs. Public raw fields are explicit static/schedule whitelists.

Twelve source tests verify real production counts, compression/UTF8/expansion limits, scalar/ID/sequence validation, null coordinates, WKT, allowlist,429/503 retry bounds, permanent errors, compressed limit, provenance/hash/path failures, preserved acquisition/published manifests, two byte-identical offline builds and a test-only modified input with missing coordinates and a conflicting main-route stop. All12 pass; TypeScript project check passes. End-to-end application/browser results are recorded separately in the delivery report.
