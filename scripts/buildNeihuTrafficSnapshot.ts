import { mkdir, writeFile, rename } from 'node:fs/promises';
import type { TrafficCongestionSnapshot, TrafficSource } from '../src/types/trafficCongestion';
import { buildReadinessCandidates, assertTrafficSnapshot } from '../src/utils/trafficCongestion';
import { auditNeihuSources } from './auditNeihuTrafficSources';
import { sha256 } from './fetchNeihuTrafficSources';

async function main() {
  const { manifest, inventory, report } = await auditNeihuSources();
  const generatedAt = manifest.sources.map(s => s.retrievedAt).sort().at(-1)!;
  const limitations = [
    'No comparable historical observations were acquired; no observed congestion ranking is available.',
    'Static detector coverage does not measure demand, congestion, capacity or crash risk.',
    'Explicit official road-name matches identify point inventory, not complete corridor coverage.',
    'Research inventory only: administrative/park boundaries and functional connecting-corridor relationships remain unverified.',
    'Legacy VD observations are stale and lack offset/direction identity. Road-speed snapshot has no verified historical crosswalk.',
    'Travel-time and pairing feeds are empty and stale. TDX historical access requires separately reviewed authentication and quotas.',
  ];
  const reasons: Record<string, string[]> = {
    A: ['Equipment metadata only; no traffic measurements.'], B: ['ExchangeTime 2024/11/14T16:46:02; timezone absent; current metadata continuity unverified.'],
    C: ['Single current legacy snapshot; timezone, definitions and section relationship not accepted for comparison.'],
    D: ['Section metadata only; no verified VD-to-section crosswalk.'], E: ['Empty feed dated 2024-12-18.'], F: ['Empty pairing list dated 2024-12-18.'],
  };
  const sources: TrafficSource[] = manifest.sources.map(s => ({ sourceId: s.id, resourceId: s.resourceId,
    title: ({ A: 'Taipei VD static', B: 'Taipei VD dynamic', C: 'Taipei road speed', D: 'Taipei road sections', E: 'Taipei travel time', F: 'Taipei detector pairing' })[s.id] ?? s.id,
    url: s.url, status: ['B', 'E', 'F'].includes(s.id) ? 'excluded' : 'limited', retrievedAt: s.retrievedAt,
    sha256: s.sha256, resourceVersion: s.edition, observedFrom: null, observedThrough: null, limitations: reasons[s.id] }));
  sources.push({ sourceId: 'G', resourceId: 'TDX-current-traffic-v2', title: 'TDX transport exchange', url: 'https://tdx.transportdata.tw/api-service/swagger/basic/7f07d940-91a4-495d-9465-1c9df89d709c', status: 'unavailable', retrievedAt: generatedAt, sha256: null, resourceVersion: 'not-acquired', observedFrom: null, observedThrough: null, limitations: ['Authenticated historical data not acquired; no credentials required by this retained-source workflow.'] });
  const sourceSha256 = Object.fromEntries(manifest.sources.map(s => [s.id, s.sha256]));
  const snapshot: TrafficCongestionSnapshot = {
    schemaVersion: '1.0.0', methodologyVersion: 'neihu-traffic-observation-review-v1', configurationVersion: '1.0.0',
    snapshotId: `neihu-readiness-${sha256(JSON.stringify(sourceSha256)).slice(0, 16)}`, generatedAt, mode: 'readiness',
    sourceResourceIds: manifest.sources.map(s => s.resourceId), sourceSha256, observedFrom: null, observedThrough: null,
    expectedSamplingInterval: null, validSampleCount: 0, excludedSampleCount: report.dynamic.receivedLaneRecords,
    detectorCoverage: inventory.devices.length, corridorCoverage: inventory.corridors.filter(c => c.deviceIds.length).length,
    directionCoverage: inventory.devices.filter(d => d.direction).length,
    observationQuality: ['historical_observations_unavailable', 'stale_dynamic_feed', 'unverified_timezone', 'empty_travel_time_feed'],
    comparatorAssumptions: ['Asia/Taipei; morning 07:00–10:00, evening 17:00–20:00, off-peak 10:00–16:00 (half-open windows).',
      '80% completeness and 20% slowdown are configurable POC assumptions, not official grades.', 'No accepted working days, holiday validation, baseline or sampling cadence.'],
    scenarioEligibility: { performance: false, quality: true, reasons: ['No verified comparable historical periods.'] },
    limitations, sources, devices: inventory.devices, corridors: inventory.corridors,
    observations: [], dailyAggregates: [], candidates: buildReadinessCandidates(inventory.devices),
  };
  assertTrafficSnapshot(snapshot);
  const output = 'public/data/neihu-congestion'; await mkdir(output, { recursive: true });
  // Validate all outputs before replacing last-known-good published snapshot.
  await writeFile(`${output}/quality-report.json`, JSON.stringify(report, null, 2) + '\n');
  await writeFile(`${output}/source-health.json`, JSON.stringify({ snapshotId: snapshot.snapshotId, sources }, null, 2) + '\n');
  await writeFile(`${output}/snapshot.pending.json`, JSON.stringify(snapshot, null, 2) + '\n');
  await rename(`${output}/snapshot.pending.json`, `${output}/snapshot.json`);
  console.log(`${snapshot.snapshotId}: ${snapshot.detectorCoverage} detectors, ${snapshot.corridorCoverage} corridors; readiness only.`);
}
main().catch(error => { console.error(String(error)); process.exitCode = 1; });
