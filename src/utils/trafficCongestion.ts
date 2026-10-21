import type { CongestionReviewCandidate, TrafficCongestionSnapshot, TrafficDevice, TrafficObservation, TrafficTimeWindowAggregate, TrafficWindow } from '../types/trafficCongestion';

export const TRAFFIC_WINDOWS: Record<TrafficWindow, { startHour: number; endHour: number }> = {
  morning: { startHour: 7, endHour: 10 }, evening: { startHour: 17, endHour: 20 }, offPeak: { startHour: 10, endHour: 16 },
};
export const DEFAULT_TRAFFIC_CONFIG = { minimumCompleteness: 0.8, slowdownThreshold: 0.2, minimumDays: 5, repeatDays: 3 };
export type TrafficAnalysisConfig = typeof DEFAULT_TRAFFIC_CONFIG;
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
/** Explicit offset required: never interpret a host-local timestamp as Taipei time. */
export function taipeiTimestamp(value: string): { date: string; hour: number; minute: number; weekday: number; milliseconds: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return null;
  const local = new Date(milliseconds + 8 * 3600_000);
  // Date.parse normalizes impossible dates such as February 30; reject them.
  const suppliedDate = value.slice(0, 10);
  const suppliedDay = Number(suppliedDate.slice(8));
  const suppliedMonth = Number(suppliedDate.slice(5, 7));
  const monthDays = new Date(Date.UTC(Number(suppliedDate.slice(0, 4)), suppliedMonth, 0)).getUTCDate();
  if (suppliedMonth < 1 || suppliedMonth > 12 || suppliedDay < 1 || suppliedDay > monthDays) return null;
  return { date: local.toISOString().slice(0, 10), hour: local.getUTCHours(), minute: local.getUTCMinutes(), weekday: local.getUTCDay(), milliseconds };
}
export function relativeSlowdown(speed: number | null, reference: number | null): number | null {
  return speed !== null && reference !== null && Number.isFinite(speed) && Number.isFinite(reference) && speed >= 0 && reference > 0
    ? (reference - speed) / reference : null;
}
export function validateTrafficObservation(row: TrafficObservation, device: TrafficDevice): string[] {
  const reasons: string[] = [];
  if (!taipeiTimestamp(row.observedAt)) reasons.push('invalid_timestamp');
  if (row.deviceId !== device.deviceId || row.sourceId !== device.sourceId) reasons.push('device_source_mismatch');
  if (row.metadataVersion !== device.metadataVersion) reasons.push('metadata_edition_mismatch');
  if (!device.direction || row.direction !== device.direction) reasons.push('direction_mismatch');
  if (row.linkId !== device.verifiedLinkId) reasons.push('link_mismatch');
  if (!row.laneIdentity || !row.laneClass) reasons.push('unknown_lane_identity');
  if (!Number.isInteger(row.intervalSeconds) || row.intervalSeconds <= 0 || 3600 % row.intervalSeconds !== 0) reasons.push('invalid_sampling_interval');
  if (row.speedKmh === null || !Number.isFinite(row.speedKmh) || row.speedKmh < 0 || row.speedKmh > 200) reasons.push('invalid_speed');
  if (row.flowCount !== null && (!Number.isFinite(row.flowCount) || row.flowCount < 0)) reasons.push('invalid_flow');
  if (row.occupancy !== null && (!Number.isFinite(row.occupancy) || row.occupancy < 0 || row.occupancy > 100)) reasons.push('invalid_occupancy');
  if (row.validationStatus !== 'valid') reasons.push('source_validation_failed');
  return reasons;
}
/** Offline-only aggregation. Enumerating requested days retains entirely absent windows. */
export function aggregateTrafficObservations(rows: TrafficObservation[], device: TrafficDevice, dates: string[],
  intervalSeconds: number, config: TrafficAnalysisConfig = DEFAULT_TRAFFIC_CONFIG): TrafficTimeWindowAggregate[] {
  if (!Number.isInteger(intervalSeconds) || intervalSeconds <= 0 || 3600 % intervalSeconds !== 0) throw new Error('Unsupported sampling interval');
  const relevant = rows.filter(row => row.deviceId === device.deviceId);
  const editions = [...new Set(relevant.map(row => JSON.stringify([row.sourceId, row.resourceVersion, row.metadataVersion, row.linkId, row.direction, row.laneIdentity, row.laneClass])))].sort();
  const output: TrafficTimeWindowAggregate[] = [];
  for (const edition of editions) {
    const [sourceId, resourceVersion, metadataVersion, linkId, direction, laneIdentity, laneClass] = JSON.parse(edition) as [string,string,string,string|null,string|null,string,string];
    for (const date of [...new Set(dates)].sort()) for (const timeWindow of Object.keys(TRAFFIC_WINDOWS) as TrafficWindow[]) {
      const window = TRAFFIC_WINDOWS[timeWindow];
      const expectedSamples = (window.endHour - window.startHour) * 3600 / intervalSeconds;
      const windowRows = relevant.filter(row => JSON.stringify([row.sourceId,row.resourceVersion,row.metadataVersion,row.linkId,row.direction,row.laneIdentity,row.laneClass]) === edition)
        .filter(row => { const time = taipeiTimestamp(row.observedAt); return time?.date === date && time.hour >= window.startHour && time.hour < window.endHour; });
      const slots = new Map<number, TrafficObservation[]>();
      let invalidSamples = 0;
      for (const row of windowRows) {
        const time = taipeiTimestamp(row.observedAt)!;
        if (time.milliseconds % (intervalSeconds * 1000) !== 0 || row.intervalSeconds !== intervalSeconds) { invalidSamples++; continue; }
        const bucket = slots.get(time.milliseconds) ?? []; bucket.push(row); slots.set(time.milliseconds, bucket);
      }
      const speeds: number[] = []; let duplicateSamples = 0;
      for (const bucket of slots.values()) {
        if (bucket.length > 1) { duplicateSamples += bucket.length - 1; invalidSamples += bucket.length; continue; }
        if (validateTrafficObservation(bucket[0],device).length) invalidSamples++;
        else speeds.push(bucket[0].speedKmh!);
      }
      const completenessRatio = speeds.length / expectedSamples;
      const exclusionReasons = [...(!direction ? ['missing_direction'] : []), ...(completenessRatio < config.minimumCompleteness ? ['insufficient_intervals'] : [])];
      output.push({deviceId:device.deviceId,linkId,direction,date,timeWindow,sourceId,resourceVersion,metadataVersion,laneIdentity,laneClass,
        expectedSamples,receivedSamples:windowRows.length,validSamples:speeds.length,missingSamples:expectedSamples-speeds.length,
        duplicateSamples,invalidSamples,completenessRatio,medianSpeedKmh:median(speeds),referenceMedianSpeedKmh:null,
        observedRelativeSlowdown:null,eligibleForComparison:false,exclusionReasons});
    }
  }
  const identity = (a:TrafficTimeWindowAggregate) => JSON.stringify([a.deviceId,a.linkId,a.direction,a.date,a.sourceId,a.resourceVersion,a.metadataVersion,a.laneIdentity,a.laneClass]);
  for (const aggregate of output) {
    if (aggregate.timeWindow === 'offPeak') continue;
    const baseline = output.find(a => a.timeWindow === 'offPeak' && identity(a) === identity(aggregate));
    if (!baseline || baseline.completenessRatio < config.minimumCompleteness || baseline.medianSpeedKmh === null || baseline.medianSpeedKmh <= 0) aggregate.exclusionReasons.push('invalid_same_day_reference');
    else { aggregate.referenceMedianSpeedKmh = baseline.medianSpeedKmh; aggregate.observedRelativeSlowdown = relativeSlowdown(aggregate.medianSpeedKmh,baseline.medianSpeedKmh); }
    aggregate.eligibleForComparison = aggregate.exclusionReasons.length === 0 && aggregate.observedRelativeSlowdown !== null;
  }
  return output;
}
export function buildReadinessCandidates(devices: TrafficDevice[]): CongestionReviewCandidate[] {
  return devices.filter(d => d.geographicScope !== 'out_of_scope').map(device => {
    const flags = [...device.sourceQualityFlags, ...(!device.direction ? ['missing_direction'] : []), ...(!device.verifiedLinkId ? ['missing_link_mapping'] : []), 'no_comparable_history'];
    return { stableCandidateId: JSON.stringify([device.deviceId,device.metadataVersion,device.direction,'readiness']), corridorId:device.corridorId,
      roadCorridor:device.roadName,deviceId:device.deviceId,validatedSegmentIdentity:device.verifiedLinkId,direction:device.direction,timeWindow:'morning',
      eligible:false,reviewTier:'insufficient',qualityTier:flags.some(f => /missing_direction|mismatch|invalid/.test(f)) ? 'urgent' : 'review',
      observedPerformanceEvidence:{medianSpeedKmh:null,relativeSlowdown:null,eligibleDays:0,repeatedSlowdownDays:0,slowdownFrequency:null},
      dataQualityEvidence:{completenessRatio:null,invalidSampleRatio:null,flags},explanation:flags,
      limitations:['No historical congestion inference; detector coverage is not traffic demand.','Weekday holiday status has not been verified.'] };
  });
}
export function buildReviewCandidates(devices: TrafficDevice[], aggregates: TrafficTimeWindowAggregate[], config: TrafficAnalysisConfig = DEFAULT_TRAFFIC_CONFIG): CongestionReviewCandidate[] {
  if(!Number.isFinite(config.minimumCompleteness)||config.minimumCompleteness<=0||config.minimumCompleteness>1||!Number.isFinite(config.slowdownThreshold)||config.slowdownThreshold<0||!Number.isSafeInteger(config.minimumDays)||config.minimumDays<2||!Number.isSafeInteger(config.repeatDays)||config.repeatDays<1)throw new Error('Invalid traffic screening assumptions');
  const result: CongestionReviewCandidate[] = [];
  for (const device of devices.filter(d => d.geographicScope !== 'out_of_scope')) {
    const all = aggregates.filter(a=>a.deviceId===device.deviceId && a.timeWindow!=='offPeak');
    if (!all.length) { result.push(...buildReadinessCandidates([device])); continue; }
    const groups = new Map<string, TrafficTimeWindowAggregate[]>();
    for (const a of all) { const k = JSON.stringify([a.sourceId,a.resourceVersion,a.metadataVersion,a.linkId,a.direction,a.laneIdentity,a.laneClass,a.timeWindow]); groups.set(k,[...(groups.get(k) ?? []),a]); }
    for (const [key, group] of groups) {
      const valid = group.flatMap(a=>{
        const baseline=aggregates.find(b=>b.timeWindow==='offPeak'&&b.deviceId===a.deviceId&&b.date===a.date&&b.direction===a.direction&&b.linkId===a.linkId&&b.sourceId===a.sourceId&&b.resourceVersion===a.resourceVersion&&b.metadataVersion===a.metadataVersion&&b.laneIdentity===a.laneIdentity&&b.laneClass===a.laneClass);
        if(!baseline||baseline.completenessRatio<config.minimumCompleteness||baseline.medianSpeedKmh===null||baseline.medianSpeedKmh<=0||a.completenessRatio<config.minimumCompleteness||!device.direction||a.direction!==device.direction||a.metadataVersion!==device.metadataVersion||a.linkId!==device.verifiedLinkId||a.sourceId!==device.sourceId||a.medianSpeedKmh===null)return [];
        return [{...a,referenceMedianSpeedKmh:baseline.medianSpeedKmh,observedRelativeSlowdown:relativeSlowdown(a.medianSpeedKmh,baseline.medianSpeedKmh)}];
      });
      const weekdays = valid.filter(a=>{const day=new Date(`${a.date}T12:00:00+08:00`).getUTCDay(); return day!==0 && day!==6;});
      const uniqueDays = new Set(valid.map(a=>a.date)).size;
      const repeated = new Set(valid.filter(a=>a.observedRelativeSlowdown! >= config.slowdownThreshold).map(a=>a.date)).size;
      const completenessRatio = group.reduce((sum,a)=>sum+a.validSamples,0)/Math.max(1,group.reduce((sum,a)=>sum+a.expectedSamples,0));
      const slowdown = median(valid.flatMap(a=>a.observedRelativeSlowdown===null?[]:[a.observedRelativeSlowdown]));
      const eligible = uniqueDays>=2 && !!device.direction && device.geographicScope!=='unverified' && completenessRatio>=config.minimumCompleteness;
      const repeatedWeekdays = new Set(weekdays.filter(a=>a.observedRelativeSlowdown! >= config.slowdownThreshold).map(a=>a.date)).size;
      const weekdaySlowdown = median(weekdays.map(a=>a.observedRelativeSlowdown!));
      const tier = !eligible ? 'insufficient' : new Set(weekdays.map(a=>a.date)).size>=config.minimumDays && repeatedWeekdays>=config.repeatDays && weekdaySlowdown!==null && weekdaySlowdown>=config.slowdownThreshold ? 'A' : repeated>=2 ? 'B' : 'C';
      const flags = [...device.sourceQualityFlags,...(eligible?[]:['insufficient_comparable_days_or_coverage']),...group.flatMap(a=>a.exclusionReasons)];
      result.push({stableCandidateId:JSON.stringify([device.deviceId,key]),corridorId:device.corridorId,roadCorridor:device.roadName,deviceId:device.deviceId,
        validatedSegmentIdentity:device.verifiedLinkId,direction:group[0].direction,timeWindow:group[0].timeWindow,eligible,reviewTier:tier,
        qualityTier:flags.length?'review':'ready',observedPerformanceEvidence:{medianSpeedKmh:median(valid.flatMap(a=>a.medianSpeedKmh===null?[]:[a.medianSpeedKmh])),relativeSlowdown:slowdown,eligibleDays:uniqueDays,repeatedSlowdownDays:repeated,slowdownFrequency:uniqueDays?repeated/uniqueDays:null},
        dataQualityEvidence:{completenessRatio,invalidSampleRatio:group.reduce((s,a)=>s+a.invalidSamples,0)/Math.max(1,group.reduce((s,a)=>s+a.receivedSamples,0)),flags:[...new Set(flags)].sort()},
        explanation:[`tier_${tier}`,`${uniqueDays} comparable days; ${repeated} repeated slowdown days`],limitations:['Point-detector speeds do not represent corridor travel time.','Weekdays include unverified public holidays.','Screening assumptions are not official congestion grades.']});
    }
  }
  return result.sort((a,b)=>a.stableCandidateId.localeCompare(b.stableCandidateId,'en'));
}

/** Reject incompatible or synthetic publication payloads before the dashboard consumes them. */
export function assertTrafficSnapshot(value: unknown): asserts value is TrafficCongestionSnapshot {
  const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const strings=(v:unknown)=>Array.isArray(v)&&v.every(x=>typeof x==='string');
  const numeric=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
  const fail=()=>{throw new Error('Unsupported or invalid traffic snapshot');};
  if(!object(value)||value.schemaVersion!=='1.0.0'||value.methodologyVersion!=='neihu-traffic-observation-review-v1'||value.configurationVersion!=='1.0.0')return fail();
  if(!['readiness','snapshot','historical'].includes(String(value.mode))||typeof value.snapshotId!=='string'||!value.snapshotId||typeof value.generatedAt!=='string'||!taipeiTimestamp(value.generatedAt))return fail();
  for(const key of ['sources','devices','corridors','observations','dailyAggregates','candidates'])if(!Array.isArray(value[key]))return fail();
  for(const key of ['sourceResourceIds','observationQuality','comparatorAssumptions','limitations'])if(!strings(value[key]))return fail();
  for(const key of ['validSampleCount','excludedSampleCount','detectorCoverage','corridorCoverage','directionCoverage'])if(!numeric(value[key]))return fail();
  if(!object(value.sourceSha256)||Object.values(value.sourceSha256).some(hash=>typeof hash!=='string'||!/^[a-f0-9]{64}$/i.test(hash)))return fail();
  if(!object(value.scenarioEligibility)||typeof value.scenarioEligibility.performance!=='boolean'||typeof value.scenarioEligibility.quality!=='boolean'||!strings(value.scenarioEligibility.reasons))return fail();
  if(value.mode!=='historical'&&value.scenarioEligibility.performance)return fail();
  for(const source of value.sources as unknown[]) {
    if(!object(source)||typeof source.sourceId!=='string'||typeof source.resourceVersion!=='string'||typeof source.url!=='string'||!/^https:\/\//.test(source.url)||!strings(source.limitations)||!['verified_analysis','limited','context_only','unavailable','excluded'].includes(String(source.status)))return fail();
    if(source.sha256!==null&&(typeof source.sha256!=='string'||!/^[a-f0-9]{64}$/i.test(source.sha256)||value.sourceSha256[source.sourceId]!==source.sha256))return fail();
  }
  for(const device of value.devices as unknown[]) {
    if(!object(device)||typeof device.deviceId!=='string'||typeof device.corridorId!=='string'||typeof device.roadName!=='string'||!strings(device.sourceQualityFlags)||!['neihu','connecting','out_of_scope','unverified'].includes(String(device.geographicScope)))return fail();
    if(device.location!==null&&(!object(device.location)||typeof device.location.latitude!=='number'||device.location.latitude< -90||device.location.latitude>90||typeof device.location.longitude!=='number'||device.location.longitude< -180||device.location.longitude>180))return fail();
  }
  for(const candidate of value.candidates as unknown[]) {
    if(!object(candidate)||typeof candidate.stableCandidateId!=='string'||typeof candidate.deviceId!=='string'||typeof candidate.corridorId!=='string'||typeof candidate.eligible!=='boolean'||!object(candidate.dataQualityEvidence)||(candidate.dataQualityEvidence.completenessRatio!==null&&!numeric(candidate.dataQualityEvidence.completenessRatio))||!strings(candidate.dataQualityEvidence.flags)||!object(candidate.observedPerformanceEvidence)||!strings(candidate.explanation)||!strings(candidate.limitations))return fail();
    if(!['A','B','C','insufficient'].includes(String(candidate.reviewTier))||!['urgent','review','ready'].includes(String(candidate.qualityTier)))return fail();
    if(value.mode!=='historical'&&(candidate.eligible||candidate.reviewTier!=='insufficient'))return fail();
  }
  // Public artifacts must never contain testing fixtures masquerading as observations.
  const hasSynthetic=(v:unknown):boolean=>Array.isArray(v)?v.some(hasSynthetic):object(v)?v.synthetic===true||Object.values(v).some(hasSynthetic):false;
  if(hasSynthetic(value))return fail();
  if((value.observations as unknown[]).some(row=>!object(row)||row.synthetic===true))return fail();
  if(value.scenarioEligibility.performance) {
    const s=value as unknown as TrafficCongestionSnapshot;
    if(!s.observedFrom||!s.observedThrough||!s.dailyAggregates.length||!s.sources.some(source=>source.status==='verified_analysis'))return fail();
    for(const aggregate of s.dailyAggregates) {
      if(!aggregate||!s.devices.some(d=>d.deviceId===aggregate.deviceId)||!s.sources.some(source=>source.sourceId===aggregate.sourceId&&source.resourceVersion===aggregate.resourceVersion&&source.status==='verified_analysis'&&source.sha256!==null&&s.sourceSha256[source.sourceId]===source.sha256)||!Number.isFinite(aggregate.completenessRatio)||aggregate.completenessRatio<0||aggregate.completenessRatio>1)return fail();
      if(!Number.isSafeInteger(aggregate.expectedSamples)||aggregate.expectedSamples<=0||!Number.isSafeInteger(aggregate.validSamples)||aggregate.validSamples<0||aggregate.validSamples>aggregate.expectedSamples||Math.abs(aggregate.completenessRatio-aggregate.validSamples/aggregate.expectedSamples)>1e-9||!taipeiTimestamp(`${aggregate.date}T12:00:00+08:00`)||!['morning','evening','offPeak'].includes(aggregate.timeWindow))return fail();
    }
    const rebuilt=buildReviewCandidates(s.devices,s.dailyAggregates);
    if(!rebuilt.some(c=>c.eligible)||s.candidates.some(c=>c.eligible&&!rebuilt.some(rebuiltCandidate=>rebuiltCandidate.stableCandidateId===c.stableCandidateId&&rebuiltCandidate.eligible&&rebuiltCandidate.reviewTier===c.reviewTier)))return fail();
  }
}
