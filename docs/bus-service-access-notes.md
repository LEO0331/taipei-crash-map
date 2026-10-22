# Official catalogue and TDX access verification

Supplement to [source audit](bus-service-source-audit.md). Checked on 2026-10-21, Asia/Taipei. This document records independent official-reference checks; it does not add source records to the published network inventory. Acquisition times below are UTC. HTTP status and hashes are from direct Node HTTPS retrieval with the approved network permission. Browser/rendered text is identified separately and has no byte hash.

## Taipei catalogues and resource classification

| Catalogue / provider | Verified reference facts | Eligibility |
| --- | --- | --- |
| [Taipei bus stops](https://data.taipei/dataset/detail?id=62bc76da-6e6b-46ee-8976-c1945092d504), Public Transportation Office | JSON link is `TstStop.json`; CSV resource `8ddf973e-c1c3-4107-8742-c6417a6fcac2` is a one-row source-contract pointer to `GetStop.gz`. Catalogue CSV size is 747 bytes. | CSV is metadata, not a city stop inventory. Test-looking JSON has exactly one record; exclude it from full-network metrics. |
| [Bus route geometry](https://data.taipei/dataset/detail?id=efad90af-4bbe-4c6a-ac60-06f3e52d8a97), Public Transportation Office | JSON link is `TstBusShape.json`; CSV resource `f3246e89-3579-470b-8034-085576bead32` is a one-row source-contract pointer to `GetBusShape.gz`. CSV size is 520 bytes. The catalogue explicitly says freshness follows the linked feed. | CSV is metadata. Despite its filename, `TstBusShape.json` contains 1,003 rows, not one example; its production purpose/full coverage is unverified. Do not label all rows synthetic solely from the filename. Exclude this old edition from current production inventory pending agency confirmation and current-feed comparison. |
| [Historical stop-location SHP](https://data.taipei/dataset/detail?id=48aa5bca-2a4f-4fb7-a658-43cba51d5d56), Public Transportation Office | Resource `dfd68d8e-d3b9-44df-b614-8850c103239f`; catalogue resource date 2021-04-11, metadata date 2022-08-29. Described fields `BSM_BUSSTO`, `BSM_CHINES`; coordinate reference TWD97. Retrieved ZIP signature verified. | Historical supplementary geometry only; no current stop crosswalk or geographic completeness verified. Feature count unverified: ZIP entry contents were not parsed. |
| [MRT exit bus information](https://data.taipei/dataset/detail?id=b1398491-07fe-40da-bb5a-ae73f4e45984), Taipei Rapid Transit Corporation | CSV resource `21a42190-91be-4921-96a7-f564c50a270d`; catalogue resource date 2026-09-01. Columns are sequence, station, exit, bus name and last update. It describes route numbers/directions around MRT exits. HTTP encoding explicitly BIG-5. | Supplementary interchange documentation, not stop coordinates or a route/variant identifier crosswalk. Parsed CSV record count unverified; 6,932 nonblank physical lines include the header and cannot alone prove the row count. Not used for coverage, demand or district claims. |

Direct resource URLs use `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=RESOURCE_ID`; blob sample URLs use `https://tcgbusfs.blob.core.windows.net/blobbus/FILENAME`.

The stop sample has `Id=10023`, `routeId=10231`, `stopLocationId=1165606697`, `seqNo=12`, `goBack="0"`; it distinguishes route-specific stop from physical stop location. Its `pgp` is null and `vector="999"`, outside the metadata's documented angle range 0–359. Those values are sample-specific and are not full-city missingness estimates. Shape keys are `UniRouteId`, `RouteID`, `SubRouteID`, `wkt`, `utime`, `GoBack`; the first row has `RouteID=10723`, `SubRouteID=-1`. Neither example establishes cross-feed joins.

| Resource | HTTP / content type | Acquisition UTC | Bytes | Original-body SHA-256 |
| --- | --- | --- | ---: | --- |
| `TstStop.json` | 200 / application/json | 2026-10-21T07:06:34.056Z | 413 | `66aaaa6cae423bf9883ecf304ab48a8eb34ac06ee2bd3905aab595d0e2292e73` |
| `TstBusShape.json` | 200 / application/octet-stream | 2026-10-21T07:06:36.486Z | 9,189,216 | `83647a05f24ca0318e870a524a74eeca720707a446580aecd029d707ca274577` |
| Stop metadata CSV | 200 / text/plain;charset=UTF-8 | 2026-10-21T07:06:36.797Z | 747 | `b338f6bcb20b1ebdceb6806ad67c2a4dfe1f14298358f6912db5e24d9d4e0c9c` |
| Shape metadata CSV | 200 / text/plain;charset=UTF-8 | 2026-10-21T07:06:36.992Z | 520 | `5362421f065a9397b80a19521602f96c8b009ad6c034f909d99b8c37eee17090` |
| Historical SHP ZIP | 200 / application/zip;charset=UTF-8 | 2026-10-21T07:07:14.748Z | 90,888 | `353511da19a0b8d522555a7c2e1e45772c044812b565a3872a2d2aea377c4dc4` |
| MRT exit CSV | 200 / text/csv;charset=BIG-5 | 2026-10-21T07:07:15.132Z | 297,390 | `83f5a921becfd57b0f12920c0167ce576374ea85ce7ddd010cbfc83784fb2ce8` |

Blob HTTP Last-Modified is 2026-09-29T10:28:26Z for the stop sample and 2025-12-19T01:38:37Z for the shape sample. The metadata CSV, SHP ZIP and MRT CSV responses supplied no Last-Modified. HTTP modification, catalogue update and data-observation time are separate concepts. No event history is acquired by any resource in this table. These independently checked auxiliary bodies were not retained as production inputs; the production manifest in the main audit is the rebuild authority.

## Licensing and attribution

All four catalogue pages label their data public/free and link [Taipei's Government Data Open License v1](https://data.taipei/rule). Its rights section permits reuse, modification and redistribution; its obligations require provider attribution, and its disclaimer does not endorse derived analyses. The footer links the [national license text](https://data.gov.tw/license). Attribute the Public Transportation Office or Taipei Rapid Transit Corporation, dataset, edition and year in outputs. This licence evidence applies to the catalogued open datasets; it does not establish unlimited or anonymous TDX API access. TDX separately identifies [its terms](https://tdx.transportdata.tw/term), which must be checked with a future authenticated subscription.

The [PTO website's official open-data declaration](https://pto.gov.taipei/News_Content.aspx?n=AB37908B5E9D3D00&s=1FE4B2FEF52B0D74&sms=1DD9E1F91DA4D5BC), linked directly from its API-documentation page, supplies the broader publication basis. Section 1 adopts Government Data Open License v1 for copyright-protected data/materials published on that site, permits free reuse, adaptation and redistribution, and requires source attribution. Its exceptions address other intellectual property, personal data and specifically restricted works; section 5 disclaims agency endorsement. The retained API v6.3 publication identifies the eight production feed URLs. Applying that publisher-wide declaration to the agency's documented external blob feeds is the publication interpretation used here; the declaration does not enumerate those URLs individually. The stop/shape catalogues additionally provide direct resource-specific corroboration. Attribute PTO, API v6.3, feed names, retrieval edition and original hashes; identify derived normalization and limitations, and do not imply official endorsement. No contrary feed-specific restriction was found in the inspected documentation.

## TDX current catalogue and supply matrix

The [official supply matrix](https://tdx.transportdata.tw/data-provide) was checked through the official indexed page. Taipei has available route, stop, station, sequence, shape, periodic schedule, first/last bus and A1/A2/N1 dynamic categories. Taipei's daily timetable and daily stop-level columns are `－`; the legend defines that as no such data. This is a publication statement, not a live endpoint test or proof of permanent absence. Generic endpoints for other cities must not be described as Taipei coverage.

The [current API documentation catalogue](https://tdx.transportdata.tw/api-service/swagger) lists basic bus v2 and v3, historical bus v2 and separate value-added services. Live browser verification loaded basic v2 and historical v2. Selecting basic v3 yielded **No API definition provided** in this session; its schema, endpoint additions and Taipei response coverage therefore remain unverified. Existing v2 availability must not be hardcoded as proof v3 is absent.

The live [TDX homepage](https://tdx.transportdata.tw/) announcement dated 2026-10-16 was opened in its detail modal, titled “TDX將新增軌道、公車及交通圖資服務”. Its bus additions are city-bus OD fares and intercity-bus OD fares. Other additions concern rail segment bundles, rail OD geometry, rail platforms, taxi stands and pedestrian-friendly areas. It does not announce a completed-trip archive or newly complete Taipei daily schedules. The modal has no separate visible detail URL; page/modal text, rather than an invented endpoint, is the evidence.

## Retrieved OpenAPI contracts and historical semantics

| Official definition | HTTP / acquisition UTC | Bytes / SHA-256 |
| --- | --- | --- |
| [Basic bus v2](https://tdx.transportdata.tw/webapi/File/Swagger/V3/2998e851-81d0-40f5-b26d-77e2f5ac4118) | 200 / 2026-10-21T07:07:53.962Z | 529,198 / `a0d26eb26244e69a576ab1835e697e1e9887b69275911a40c562c36217f1c7c9` |
| [Historical bus v2](https://tdx.transportdata.tw/webapi/File/Swagger/V3/39472fde-f790-42b9-9c8b-88282118e6b1) | 200 / 2026-10-21T07:07:55.208Z | 352,587 / `cbe5d9b5f6ce9d4d60e9c73b6e89960bf3815e048db5865612f4424c3f0f9475` |

Both are JSON OpenAPI documents served as text/plain UTF-8. `V3` in the document download path is not the bus API version: each `info.version` is `v2`.

Historical server: `https://tdx.transportdata.tw/api/historical`. Documented relative city endpoints include `/v2/Historical/Bus/RealTimeByFrequency/City/{City}` and `/v2/Historical/Bus/RealTimeNearStop/City/{City}`. These are documented paths; no operational endpoint was queried and zero Taipei operational records were validated.

- A1 is periodic vehicle telemetry; `GPSTime` is vehicle time. Missing points cannot establish missed trips.
- A2 defines `A2EventType=0` departure, `1` arrival; `GPSTime` is the GPS time triggering that event, documented with ISO 8601 timezone offset. `TripStartTimeType=0` actual, `1` estimated, `2` unable to infer. A `TripStartTime` without its qualifying type is not necessarily actual dispatch.
- A2 direction codes are 0 outbound, 1 inbound, 2 loop, 255 unknown. This is a TDX contract and must not silently replace Taipei's different unknown-direction coding.
- The dynamic `Dates` parameter advertises June 2021 through yesterday, updated at 08:00, with at most seven queried dates. The general historical header instead says May 2021 onward. Preserve that discrepancy; neither establishes Taipei-specific retained completeness.
- Historical route, schedule and stop-sequence versions support source-edition research. Published or estimated schedule `ArrivalTime`/`DepartureTime` fields do not become completed operational events merely because the enclosing endpoint is historical. The schedule `TimeType` distinguishes estimated from scheduled time.

Current documentation restricts unauthenticated visitor access to browser/basic services, 20 calls per source IP per day. Member Client ID/Secret and plan privileges govern further access and rate. Basic v2 advertises 1,500 calls or 150 MB per point; historical v2 advertises 10 calls or 20 MB per point. These differ by service and are not universal quotas. The homepage separately advertises a basic-member allowance; no membership or remaining balance was verified here.

**Mode B remains blocked:** credentials/entitlements, Taipei operational availability, retained coverage, duplicate handling, expected-versus-observed completeness, service-day/calendar interpretation and stable route/stop crosswalks have not been verified. No authenticated data, token or vehicle-history record was acquired. Documentation existence and event definitions satisfy only reference discovery, not the analytical eligibility gate.
