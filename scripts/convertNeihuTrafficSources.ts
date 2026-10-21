import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
// Existing repository dev dependency; this package does not bundle declarations.
// @ts-expect-error jsdom has no bundled TypeScript declaration
import { JSDOM } from 'jsdom';
import { parse } from 'csv-parse/sync';
import type { TrafficDevice, TrafficCorridor } from '../src/types/trafficCongestion';
import { RAW_DIR, SOURCE_EDITIONS, sha256, type AcquisitionManifest, type RetainedSource } from './fetchNeihuTrafficSources';

export const CORRIDORS = [
  ['ruiguang', '瑞光路', 'Ruiguang Road'], ['gangqian', '港墘路', 'Gangqian Road'],
  ['tiding', '堤頂大道', 'Tiding Boulevard'], ['jiuzong', '舊宗路', 'Jiuzong Road'],
  ['minquan', '民權東路', 'Minquan East Road'], ['chenggong', '成功路', 'Chenggong Road'],
  ['huandong', '環東大道', 'Huandong Boulevard'],
] as const;
export function detectCataloguePointer(text: string): boolean {
  try {
    const rows = parse(text.replace(/^\uFEFF/, ''), { columns: true, skip_empty_lines: true }) as Record<string, string>[];
    return rows.length > 0 && rows.some(row => Object.keys(row).some(k => /介接網址/.test(k))) && rows.every(row => Object.values(row).some(v => /^https?:\/\//.test(v)));
  } catch { return false; }
}
interface XmlNode { localName: string; textContent: string | null; querySelectorAll(selector: string): XmlNode[] }
interface XmlDocument extends XmlNode { documentElement: XmlNode; getElementsByTagNameNS(namespace: string, name: string): XmlNode[] }
export function xmlDocument(text: string, root: string): XmlDocument {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('XML entities are forbidden');
  const document = new JSDOM(text, { contentType: 'text/xml' }).window.document;
  if (document.documentElement.localName !== root) throw new Error(`Unsupported source edition: expected ${root}`);
  return document;
}
export const field = (node: XmlNode, tag: string): string => Array.from(node.querySelectorAll('*')).find(element => element.localName === tag)?.textContent?.trim() ?? '';
function required(node: XmlNode, tag: string) { const value = field(node, tag); if (!value) throw new Error(`Schema drift: missing ${tag}`); return value; }
export function parseStaticDevices(text: string): { devices: TrafficDevice[]; corridors: TrafficCorridor[]; totalDevices: number; version: string; updatedAt: string } {
  const doc = xmlDocument(text, 'VDList');
  if (required(doc, 'AuthorityCode') !== 'TPE') throw new Error('Unexpected source authority');
  const version = required(doc, 'LinkVersion'); const updatedAt = required(doc, 'UpdateTime');
  if (version !== '25.12.1') throw new Error('Unreviewed LinkVersion; review metadata identity before accepting a new edition');
  if (!/T.*(?:\+08:00|Z)$/.test(updatedAt) || !Number.isFinite(Date.parse(updatedAt))) throw new Error('Invalid static timestamp');
  const rows = Array.from(doc.querySelectorAll('VD'));
  if (!rows.length) throw new Error('Static inventory unexpectedly empty');
  const devices: TrafficDevice[] = []; const seen = new Set<string>();
  for (const row of rows) {
    const deviceId = required(row, 'VDID'); if (seen.has(deviceId)) throw new Error(`Duplicate detector identity ${deviceId}`); seen.add(deviceId);
    const roadName = required(row, 'RoadName');
    const corridor = CORRIDORS.find(([, name]) => roadName.startsWith(name)); if (!corridor) continue;
    const longitude = Number(required(row, 'PositionLon')); const latitude = Number(required(row, 'PositionLat'));
    const location = Number.isFinite(longitude) && Number.isFinite(latitude) && longitude >= 119 && longitude <= 123 && latitude >= 21 && latitude <= 26 ? { latitude, longitude } : null;
    const links = Array.from(row.querySelectorAll('DetectionLink'));
    // A bi-directional/multi-link device remains a single inventory point; never choose an arbitrary link.
    const link = links.length === 1 ? links[0] : null;
    const direction = link ? field(link, 'RoadDirection') || null : null;
    const verifiedLinkId = link ? field(link, 'LinkID') || null : null;
    const laneValue = link ? Number(field(link, 'ActualLaneNum')) : NaN;
    devices.push({ deviceId, sourceId: 'A', roadName, corridorId: corridor[0], verifiedLinkId, direction,
      roadClass: field(row, 'RoadClass') || null, location, detectorType: field(row, 'VDType') || null,
      laneCount: Number.isInteger(laneValue) && laneValue > 0 ? laneValue : null, metadataVersion: version,
      geographicScope: 'unverified', sourceQualityFlags: ['geographic_scope_unverified', 'historical_observations_unavailable',
        ...(!location ? ['invalid_geometry'] : []), ...(!verifiedLinkId ? ['missing_or_ambiguous_link'] : []), ...(!direction ? ['missing_or_ambiguous_direction'] : [])] });
  }
  devices.sort((a, b) => a.deviceId.localeCompare(b.deviceId, 'en'));
  const corridors = CORRIDORS.map(([corridorId, nameZh, nameEn]) => ({ corridorId, nameZh, nameEn,
    deviceIds: devices.filter(d => d.corridorId === corridorId).map(d => d.deviceId),
    limitations: ['Explicit official road-name match; no assertion of complete corridor or park-boundary coverage.', 'No eligible historical observations.'] }));
  return { devices, corridors, totalDevices: rows.length, version, updatedAt };
}
export function auditDynamic(text: string) {
  const doc = xmlDocument(text, 'VDInfoSet');
  const observedAt = required(doc, 'ExchangeTime');
  const rows = Array.from(doc.querySelectorAll('VDDevice'));
  if (!rows.length) throw new Error('Dynamic schema drift: missing VDDevice');
  const ids = rows.map(row => required(row, 'DeviceID'));
  const lanes = Array.from(doc.querySelectorAll('LaneData'));
  for (const lane of lanes) for (const tag of ['LaneNO', 'Volume', 'AvgSpeed', 'AvgOccupancy']) required(lane, tag);
  return { observedAt, receivedDevices: rows.length, duplicateDevices: ids.length - new Set(ids).size,
    receivedLaneRecords: lanes.length, intervalValues: [...new Set(rows.map(r => required(r, 'TimeInterval')))].sort(),
    zeroSpeedRecords: lanes.filter(l => Number(field(l, 'AvgSpeed')) === 0).length,
    negativeSpeedRecords: lanes.filter(l => Number(field(l, 'AvgSpeed')) < 0).length,
    invalidNumericRecords: lanes.filter(l => !['Volume', 'AvgSpeed', 'AvgOccupancy'].every(t => Number.isFinite(Number(field(l, t))))).length,
    invalidOccupancyRecords: lanes.filter(l => Number(field(l, 'AvgOccupancy')) < 0 || Number(field(l, 'AvgOccupancy')) > 100).length,
    invalidVolumeRecords: lanes.filter(l => Number(field(l, 'Volume')) < 0).length,
    missingTimezone: !/(?:Z|[+-]\d\d:\d\d)$/.test(observedAt), ids };
}
export function validateRetainedSource(expected: typeof SOURCE_EDITIONS[number], retained: RetainedSource | undefined, bytes: Buffer) {
  if (!retained || retained.url !== expected.url || retained.edition !== expected.edition || retained.resourceId !== expected.resourceId || path.basename(retained.file) !== retained.file) throw new Error('Unsupported source edition or identity');
  if (bytes.length !== retained.bytes || sha256(bytes) !== retained.sha256) throw new Error(`Original hash mismatch ${expected.id}`);
}
export async function loadAuditedInputs() {
  const manifest = JSON.parse(await readFile(path.join(RAW_DIR, 'manifest.json'), 'utf8')) as AcquisitionManifest;
  if (manifest.schemaVersion !== '1.0.0' || manifest.sources.length !== SOURCE_EDITIONS.length) throw new Error('Unsupported acquisition manifest');
  const texts: Record<string, string> = {};
  for (const expected of SOURCE_EDITIONS) {
    const retained = manifest.sources.find(source => source.id === expected.id);
    if (!retained || retained.url !== expected.url || retained.edition !== expected.edition || retained.resourceId !== expected.resourceId || path.basename(retained.file) !== retained.file) throw new Error('Unsupported source edition or identity');
    const bytes = await readFile(path.join(RAW_DIR, retained.file));
    validateRetainedSource(expected, retained, bytes);
    texts[expected.id] = (expected.id === 'C' ? gunzipSync(bytes, { maxOutputLength: 4 * 1024 * 1024 }) : bytes).toString('utf8');
  }
  return { manifest, texts, inventory: parseStaticDevices(texts.A), dynamic: auditDynamic(texts.B) };
}
