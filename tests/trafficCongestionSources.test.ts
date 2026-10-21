import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { boundedFetch, sha256, SOURCE_EDITIONS } from '../scripts/fetchNeihuTrafficSources';
import { auditDynamic, detectCataloguePointer, loadAuditedInputs, parseStaticDevices, xmlDocument, validateRetainedSource } from '../scripts/convertNeihuTrafficSources';
import { auditNeihuSources } from '../scripts/auditNeihuTrafficSources';

// Deliberately synthetic parser fixtures. None is written into public data.
const vd = (extra = '') => `<VD><VDID>fixture-1</VDID><RoadName>瑞光路</RoadName><PositionLon>121.57</PositionLon><PositionLat>25.07</PositionLat><DetectionLinks><DetectionLink><LinkID>fixture-link</LinkID><RoadDirection>E</RoadDirection><ActualLaneNum>2</ActualLaneNum></DetectionLink>${extra}</DetectionLinks></VD>`;
const inventory = (body = vd()) => `<VDList><UpdateTime>2026-10-21T00:00:00+08:00</UpdateTime><AuthorityCode>TPE</AuthorityCode><LinkVersion>25.12.1</LinkVersion><VDs>${body}</VDs></VDList>`;
const dynamic = (speed = '0', occupancy = '0', volume = '0') => `<VDInfoSet><ExchangeTime>2024/11/14T16:46:02</ExchangeTime><VDDevice><DeviceID>fixture-1</DeviceID><TimeInterval>5</TimeInterval><LaneData><LaneNO>0</LaneNO><Volume>${volume}</Volume><AvgSpeed>${speed}</AvgSpeed><AvgOccupancy>${occupancy}</AvgOccupancy></LaneData></VDDevice></VDInfoSet>`;

describe('offline official traffic source boundary', () => {
  it('detects catalogue pointers without counting them as detector rows', () => {
    expect(detectCataloguePointer('\uFEFF縣市,介接網址\n臺北市,https://example.org/VD.xml')).toBe(true);
    expect(detectCataloguePointer('VDID,Speed\nfixture,12')).toBe(false);
    expect(() => parseStaticDevices('縣市,介接網址\n臺北市,https://example.org')).toThrow();
  });
  it('preserves the exact official device/link/direction and marks scope unverified', () => {
    const { devices } = parseStaticDevices(inventory());
    expect(devices[0]).toMatchObject({ deviceId: 'fixture-1', verifiedLinkId: 'fixture-link', direction: 'E', laneCount: 2, geographicScope: 'unverified', location: { longitude: 121.57, latitude: 25.07 } });
  });
  it('does not choose an arbitrary direction/link for a multi-link detector', () => {
    const { devices } = parseStaticDevices(inventory(vd('<DetectionLink><LinkID>other</LinkID><RoadDirection>W</RoadDirection></DetectionLink>')));
    expect(devices[0].direction).toBeNull(); expect(devices[0].verifiedLinkId).toBeNull();
  });
  it('retains missing mapping and invalid geometry as quality gaps', () => {
    const { devices } = parseStaticDevices(inventory().replace('<LinkID>fixture-link</LinkID>', '').replace('121.57', '999'));
    expect(devices[0].verifiedLinkId).toBeNull(); expect(devices[0].location).toBeNull();
  });
  it('rejects schema, identity, timezone, version drift and duplicate detector metadata', () => {
    expect(() => parseStaticDevices(inventory().replace('25.12.1', 'future'))).toThrow(/LinkVersion/);
    expect(() => parseStaticDevices(inventory().replace('+08:00', ''))).toThrow(/timestamp/);
    expect(() => parseStaticDevices(inventory(vd() + vd()))).toThrow(/Duplicate/);
    expect(() => parseStaticDevices(inventory().replace('<VDID>fixture-1</VDID>', ''))).toThrow(/VDID/);
    expect(() => parseStaticDevices(inventory().replace('TPE', 'OTHER'))).toThrow(/authority/);
  });
  it('rejects external XML entities and unsupported editions', () => {
    expect(() => xmlDocument('<!DOCTYPE x [<!ENTITY e SYSTEM "file:///secret">]><VDList/>', 'VDList')).toThrow(/entities/);
    expect(() => xmlDocument('<Other/>', 'VDList')).toThrow(/edition/);
  });
  it('audits stale timezone-free lane records without inventing interval units or zero semantics', () => {
    const result = auditDynamic(dynamic());
    expect(result).toMatchObject({ missingTimezone: true, zeroSpeedRecords: 1, intervalValues: ['5'] });
    expect(auditDynamic(dynamic('-1', '101', '-1'))).toMatchObject({ negativeSpeedRecords: 1, invalidOccupancyRecords: 1, invalidVolumeRecords: 1 });
    expect(auditDynamic(dynamic('unknown'))).toMatchObject({ invalidNumericRecords: 1 });
    expect(() => auditDynamic(dynamic().replace('<AvgSpeed>0</AvgSpeed>', ''))).toThrow(/AvgSpeed/);
  });
  it('rejects authentication failures without retrying or leaking secrets', async () => {
    let calls = 0;
    await expect(boundedFetch(SOURCE_EDITIONS[0].url, (async () => { calls++; return new Response('', { status: 401 }); }) as typeof fetch)).rejects.toThrow('HTTP 401');
    expect(calls).toBe(1);
  });
  it('honors bounded Retry-After and refuses excessive delays', async () => {
    let calls = 0;
    const body = await boundedFetch(SOURCE_EDITIONS[0].url, (async () => ++calls === 1 ? new Response('', { status: 429, headers: { 'retry-after': '0' } }) : new Response('official bytes')) as typeof fetch);
    expect(body.toString()).toBe('official bytes'); expect(calls).toBe(2);
    await expect(boundedFetch(SOURCE_EDITIONS[0].url, (async () => new Response('', { status: 429, headers: { 'retry-after': '3600' } })) as typeof fetch)).rejects.toThrow(/deferred/);
    await expect(boundedFetch(SOURCE_EDITIONS[0].url, (async () => new Response('', { status: 429, headers: { 'retry-after': new Date(Date.now() + 60_000).toUTCString() } })) as typeof fetch)).rejects.toThrow(/deferred/);
    await expect(boundedFetch('https://unreviewed.example/')).rejects.toThrow(/Unreviewed/);
  });
  it('enforces retained byte limits', async () => {
    await expect(boundedFetch(SOURCE_EDITIONS[0].url, (async () => new Response(new Uint8Array(4 * 1024 * 1024 + 1))) as typeof fetch)).rejects.toThrow(/bound/);
  });
  it('rejects original-byte hash mismatch, edition mismatch and traversal before publication', () => {
    const expected = SOURCE_EDITIONS[0]; const bytes = Buffer.from('fixture original');
    const retained = { ...expected, sha256: sha256(bytes), bytes: bytes.length, retrievedAt: '2026-10-21T00:00:00Z', httpStatus: 200 };
    expect(() => validateRetainedSource(expected, retained, bytes)).not.toThrow();
    expect(() => validateRetainedSource(expected, retained, Buffer.from('tampered'))).toThrow(/hash mismatch/);
    expect(() => validateRetainedSource(expected, { ...retained, edition: 'future' }, bytes)).toThrow(/edition/);
    expect(() => validateRetainedSource(expected, { ...retained, file: '../elsewhere' }, bytes)).toThrow(/identity/);
  });
  it('validates original hashes and publishes no synthetic or stale operational observations', async () => {
    const input = await loadAuditedInputs();
    expect(input.manifest.sources).toHaveLength(6);
    const snapshot = JSON.parse(await readFile('public/data/neihu-congestion/snapshot.json', 'utf8'));
    expect(snapshot.mode).toBe('readiness'); expect(snapshot.scenarioEligibility.performance).toBe(false);
    expect(snapshot.observations).toEqual([]); expect(snapshot.dailyAggregates).toEqual([]);
    expect(snapshot.devices).toEqual(input.inventory.devices);
    expect(snapshot.snapshotId).toBe(`neihu-readiness-${sha256(JSON.stringify(snapshot.sourceSha256)).slice(0, 16)}`);
    expect(snapshot.sourceSha256).toEqual(Object.fromEntries(input.manifest.sources.map(s => [s.id, s.sha256])));
    expect(snapshot.devices.every((d: { deviceId: string }) => !d.deviceId.startsWith('fixture'))).toBe(true);
  });
  it('audit is deterministic and unknown historic completeness stays unknown', async () => {
    const { report } = await auditNeihuSources();
    expect(report.periodQuality.expectedObservations).toBeNull();
    expect(report.periodQuality.missingIntervals).toBeNull();
    expect(report.travelTime.rows).toBe(0); expect(report.travelPairs.rows).toBe(0);
    expect(report).toEqual((await auditNeihuSources()).report);
  });
});
