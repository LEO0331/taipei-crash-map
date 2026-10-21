# Neihu congestion source feasibility audit

Related delivery documents: [繁中 MVP](neihu-congestion-decision-mvp.zh-TW.md), [methodology](neihu-congestion-methodology.md), [attachment acceptance report](neihu-congestion-delivery.md).

2026-10-21 attachment follow-up: the scoped fetch command reused the retained manifest (no fresh API acquisition); audit passed and two rebuilds retained snapshot SHA256 `e54b852d17388683eddc16b46c930178451df4af78a4802663eaef579ccf3441`. Recount confirms 31 distinct accepted static LinkIDs, 58 quality-review candidates and 0 performance candidates. TUIC web retrieval still returned 502; the TDX homepage exposed no usable documentation text in this retrieval. The earlier acquisition evidence below remains unchanged; no new authenticated archive or quota was verified.

Audit begun 2026-10-21 (Asia/Taipei), before feature implementation. Gate: **readiness only**. A reachable feed is not historical evidence. No comparative congestion grades or travel-time improvements may be attributed to this snapshot.

## Initial official-resource findings

| Source | Official catalogue ID | Actual resource | Classification / decision |
| --- | --- | --- | --- |
| A VD static | 47cb9090-e1c9-4b1d-b299-b11c375c5ee2 | https://tcgbusfs.blob.core.windows.net/blobtisv/VD.xml | limited: verified equipment inventory, not traffic observations |
| B VD dynamic | e57afe7f-3c9e-4f31-9208-eed859a92600 | https://tcgbusfs.blob.core.windows.net/blobtisv/GetVDDATA.xml | excluded: retrieved 2026-10-21 but ExchangeTime is 2024/11/14T16:46:02, without UTC offset |
| C road speed | b5aaf33a-a6dc-4836-bce6-09986241fe11 | catalogue resource 447c3f04-bce8-4fa4-95a8-16b61e295246 points to https://tcgbusfs.blob.core.windows.net/blobtisv/GetVD.xml.gz | limited pending schema and period verification; pointer rows are not observations |
| D road sections | e3aa9aa3-6e77-4537-8b7a-4a41908b2089 | resource 37e5a1dd-1be4-45cd-9e05-8f089cc31b1a points to https://tcgbusfs.blob.core.windows.net/blobtisv/Section.xml | limited: section metadata; no assumed equivalence with A LinkID |
| E travel time | 6ccdeddb-c66a-4cf5-8742-46c322f01b3b | resource 1eecf5ff-4ab8-4c1f-8abe-4e3d404979e3 points to https://tcgbusfs.blob.core.windows.net/blobtisv/ETagPairLive.xml | limited pending timestamp/schema audit; never substituted with VD point speed |
| F detector pairing | 9a5139ca-f3fe-494e-a737-5f761c037f37 | resource 4f712be7-f953-4ec6-ad4c-4ca8c920bcf5 points to https://tcgbusfs.blob.core.windows.net/blobtisv/ETagPair.xml | limited: pairing metadata only; no manufactured section joins |
| G TDX | https://tdx.transportdata.tw/ | current traffic-information v2 Swagger https://tdx.transportdata.tw/api-service/swagger/basic/7f07d940-91a4-495d-9465-1c9df89d709c | unavailable for authenticated history: no supplied credentials; no bulk historical request attempted |

Catalogue pages: `https://data.taipei/dataset/detail?id=<catalogue ID>`. They identify the provider as Taipei Traffic Engineering Office, access public/free, and link the Government Data Open License. CSV C/E/F bytes are legacy Big5, D UTF-8 BOM; preserve originals before decoding. A XML declares UTF-8 and traffic schema namespace; A fields include VDID, LinkVersion, DetectionLinks/DetectionLink/LinkID, Bearing, RoadDirection, LaneNum, ActualLaneNum, PositionLon, PositionLat, RoadName, RoadClass, VDType. Published coordinates are decimal longitude/latitude; accepted only within Taiwan coordinate bounds. No district polygon or official Neihu Technology Park boundary is supplied by A.

B is a different legacy schema (VDInfoSet, ExchangeTime, VDDevice/DeviceID, TimeInterval, TotalOfLane, LaneData/LaneNO/Volume/AvgSpeed/AvgOccupancy). Its `TimeInterval=5` is not converted to an asserted observation cadence before definitions are verified. B does not supply per-record LinkID or travel direction. Current static metadata cannot establish device identity continuity with a 2024 observation. Zero speed/volume and occupancy exist; undocumented zero/sentinel semantics remain unknown. B is retained for source audit only, never operational public observations.

No two-week comparable archive was obtained. Expected historical intervals, missing days, detector downtime, valid interval ratios, repeat-day slowdown, peak/off-peak baseline, and holiday status therefore remain **unknown**, not zero. Readiness candidates identify missing evidence, not congestion. Candidate corridors are matched by explicit official RoadName strings only; a matching road does not imply full-corridor coverage. All selected devices are labelled scope unverified until authoritative administrative/park geometry and functional connections are reviewed. They are research inventory, not validated Neihu study coverage.

TDX's current official Swagger states browser-only guest basic access (20 requests/IP/day), authenticated member access to historical services, and subscription-specific rate limits. No secrets are queried or emitted. An offline retained archive integration requires a separately verified service edition, device/date filters, quotas and credentials from TDX_CLIENT_ID / TDX_CLIENT_SECRET. This POC deliberately makes no speculative authenticated calls and does not depend on withdrawn five-minute datasets.

## Policy context (independent evidence)

- https://tuic.gov.taipei/neihu_traffic/ returned 502 in web retrieval; retained as an unavailable policy reference, without attributing unverified text.
- https://dot.gov.taipei/News_Content.aspx?n=42F54DDC552218AD&s=6B82592FD161ADB6 could not be accessed through web retrieval.
- Official background https://dot.gov.taipei/Content_List.aspx?n=83A9D742D585DEE7 identifies limited external roads/bridges and commuting demand as context.
- Official 2026-08-16 release https://dot.gov.taipei/News_Content.aspx?n=D739A9F6B5C0AB95&s=B2603ED5E6FD0229&sms=72544237BBE4C5F6 reports seven-corridor afternoon travel-time improvement. This is an agency claim with a distinct study population; it is not a measured result of this POC and is not imported into scoring.

## Reproducible acquisition and publication

The bounded offline fetch manifest records actual endpoint, original SHA256, bytes, HTTP status, retrieval timestamp and source edition. Download at most one current payload per allowlisted resource, 4 MiB per body, a 20-second timeout and at most one bounded Retry-After retry. No recurring collection, citywide historical archive or browser API access. Original files are retained below data/raw/neihu-congestion; total retention is intentionally small. Validate all retained hashes/schema before conversion. A failed fetch cannot replace a good raw manifest; a failed validation/conversion cannot replace snapshot.json. GeneratedAt derives from retained acquisition metadata; identical retained source bytes/manifest produce identical analytical outputs. See the retained manifest and generated quality report for the final measured inventory and hashes.

## Final measured edition and acceptance decision

Retained acquisition: 2026-10-21T01:43:12.243Z through 2026-10-21T01:43:13.322Z (09:43 Asia/Taipei). All six official endpoints returned HTTP 200 without authentication. Original retained total: **1,710,095 bytes**. Full per-resource hashes, exact retrieval times and bytes are in `data/raw/neihu-congestion/manifest.json`; the original compressed C bytes are hashed before decompression.

| Source | Actual retained schema / period | Received and accepted coverage |
| --- | --- | --- |
| A | VDList; LinkVersion 25.12.1; UpdateTime 2026-10-21T00:00:00.000+08:00; UpdateInterval 60 is metadata refresh, not observation sampling | 604 citywide device metadata rows; 58 explicit road-name matches across seven research corridors; 0 invalid scoped coordinates; 31 unambiguous link/direction mappings, 27 multi-link mappings left unresolved; all 58 geographic scopes unverified |
| B | VDInfoSet; ExchangeTime 2024/11/14T16:46:02; TimeInterval text 5 on all devices, units not accepted | 724 devices, 2,195 lane records, 0 duplicate device IDs, 89 zero-speed records; 0 negative speeds, invalid numeric/occupancy/negative volume values; all 58 scoped IDs also appear, but identity continuity is unverified; 0 accepted operational observations |
| C | gzip UTF-8 XML; namespace http://www.iii.org.tw/dax/vd; ExchangeData/SectionData; SectionId/SectionName/AvgSpd/AvgOcc/TotalVol/MOELevel/StartWgsX/Y/EndWgsX/Y; ExchangeTime 2026/10/21T09:43:03 without offset | 612 section rows at one timestamp; no documented accepted sampling/units/sentinel semantics or verified crosswalk to A; no historical comparison, no public performance values |
| D | UTF-8 SectionList; SectionID/SectionName/RoadID/RoadName/RoadDirection/SectionLength/SectionStart/SectionEnd; UpdateTime 2026-10-21T00:00:00.000+08:00 | 818 section metadata rows; do not infer that `L_` prefix stripping establishes a VD LinkID relationship |
| E | UTF-8 ETagPairLiveList; UpdateTime 2024-12-18T17:40:39.003+08:00; UpdateInterval 300 | Empty ETagPairLives; 0 observations, stale; final classification excluded |
| F | UTF-8 ETagPairList; UpdateTime 2024-12-18T00:00:00.000+08:00; UpdateInterval 86400 | Empty ETagPairs; 0 verified pairings, stale; final classification excluded |

Link/direction confidence is exact published A single-link identity only; no road-section geometry, interpolation, point-speed-to-travel-time transformation or spatial-proximity join is published. Multi-link devices retain official device coordinates but cannot claim one arbitrarily selected road direction. Detector metadata edition changes are rejected until reviewed (`25.12.1` is the accepted version). Every device has `geographic_scope_unverified` and `historical_observations_unavailable` quality flags. Road matches intentionally remain research inventory including other portions of Minquan East/Chenggong; they do not assert all points functionally serve Neihu Technology Park.

For every source, historical expected intervals, received comparable intervals, missing days/intervals, source outages, detector downtime, interval duplicates, accepted day completeness and historical direction continuity are **not measurable / unknown**, except accepted observations and accepted working days are **0**. Metadata refresh intervals are not measurement intervals. Numerical zeroes in B are counted for audit but not reinterpreted as valid congestion, missing demand or imputed speeds. Occupancy is separate from count. No accepted units or lane aggregation model are asserted for excluded observations. The absence of data is an evidence gap, never a zero-speed or zero-demand measurement.

The requested TDX Swagger ID `30bc573f-0d73-47f2-ac3c-37c798b86d37` rendered only a JavaScript shell in web retrieval. The [current official traffic-information Swagger](https://tdx.transportdata.tw/api-service/swagger/basic/7f07d940-91a4-495d-9465-1c9df89d709c) was independently indexed with API use notes and [TDX's current homepage](https://tdx.transportdata.tw/) confirms 20 daily guest basic requests and membership-specific access. The exact historical service endpoint, Taipei detector availability, supported date filters and credential-specific quotas remain unverified; this is an explicit feasibility limitation, not a claim that history does not exist.

## Regeneration and actual verification

Run from repository root:

```sh
npx tsx scripts/fetchNeihuTrafficSources.ts           # reuse checkpoint if present
npx tsx scripts/fetchNeihuTrafficSources.ts --refresh # intentional new bounded edition
npx tsx scripts/auditNeihuTrafficSources.ts
npx tsx scripts/buildNeihuTrafficSnapshot.ts
npx vitest run tests/trafficCongestionSources.test.ts
```

The converter is imported by both audit/build; it does not publish a partial intermediate dataset. Acquisition stages content-addressed original files before replacing its manifest. Build verifies source identity, edition, byte size, SHA256, XML schema roots and static metadata version before replacing the last-known-good snapshot. Original files without a committed manifest are not converted. No credentials are needed for these public Taipei resources; no TDX token or secret is read/logged/stored.

Actual checks: bounded fetch passed (six resources); audit passed; build passed; 13 source tests passed. The initial sandbox test launch failed at Vitest temporary-cache rename with EPERM, then the identical command passed outside the sandbox. Two consecutive retained-input builds produced identical snapshot SHA256 `e54b852d17388683eddc16b46c930178451df4af78a4802663eaef579ccf3441`. Snapshot ID `neihu-readiness-49f28aaa55758ffe`; public observations and daily aggregates are empty. Synthetic fixture strings appear only in tests. No historical ranking eligibility was granted.
