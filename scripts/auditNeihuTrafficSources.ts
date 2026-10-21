import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadAuditedInputs, xmlDocument, field } from './convertNeihuTrafficSources';

export async function auditNeihuSources() {
  const input = await loadAuditedInputs();
  const { texts, inventory, dynamic, manifest } = input;
  const speed = xmlDocument(texts.C, 'ExchangeData');
  const sections = xmlDocument(texts.D, 'SectionList');
  const travel = xmlDocument(texts.E, 'ETagPairLiveList');
  const pairs = xmlDocument(texts.F, 'ETagPairList');
  const report = {
    schemaVersion: '1.0.0', gate: 'readiness', sources: manifest.sources,
    static: { publishedAt: inventory.updatedAt, linkVersion: inventory.version, totalDevices: inventory.totalDevices,
      scopedDevices: inventory.devices.length, coveredCorridors: inventory.corridors.filter(c => c.deviceIds.length).length,
      directionCoverage: [...new Set(inventory.devices.map(d => d.direction).filter(Boolean))].sort(),
      invalidGeometry: inventory.devices.filter(d => !d.location).length,
      missingLink: inventory.devices.filter(d => !d.verifiedLinkId).length,
      missingDirection: inventory.devices.filter(d => !d.direction).length },
    dynamic: { ...dynamic, ids: undefined,
      metadataMatchedDevices: dynamic.ids.filter(id => inventory.devices.some(d => d.deviceId === id)).length,
      acceptedObservations: 0, excludedReason: 'Stale 2024 exchange; missing timezone/direction/link; no verified metadata continuity or sampling definition.' },
    roadSpeed: { publishedAt: field(speed, 'ExchangeTime'), sections: speed.getElementsByTagNameNS('*', 'SectionData').length,
      decision: 'Single snapshot; timestamp offset, unit definitions and section identity joins unverified; excluded from performance.' },
    roadSections: { publishedAt: field(sections, 'UpdateTime'), sections: sections.querySelectorAll('Section').length,
      decision: 'No verified VD LinkID-to-SectionID crosswalk; do not strip prefixes to invent joins.' },
    travelTime: { publishedAt: field(travel, 'UpdateTime'), rows: travel.querySelectorAll('ETagPairLive').length, decision: 'Empty stale feed; no travel-time observations.' },
    travelPairs: { publishedAt: field(pairs, 'UpdateTime'), rows: pairs.querySelectorAll('ETagPair').length, decision: 'Empty stale pairing inventory.' },
    periodQuality: { expectedObservations: null, validObservations: 0, receivedComparableObservations: 0, missingIntervals: null,
      missingDays: null, samplingIntervalSeconds: null, duplicateIntervalTimestamps: null, detectorDowntime: null,
      outages: null, metadataContinuity: 'unverified', speedUnits: 'not accepted', flowUnits: 'not accepted',
      sentinelSemantics: 'unverified; zeros remain unknown', acceptedWorkingDays: 0, holidayCalendar: 'unverified' },
  };
  return { ...input, report };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  auditNeihuSources().then(async ({ report }) => {
    await mkdir('public/data/neihu-congestion', { recursive: true });
    await writeFile('public/data/neihu-congestion/quality-report.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report.static));
  }).catch(error => { console.error(String(error)); process.exitCode = 1; });
}
