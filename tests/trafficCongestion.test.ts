import { describe, expect, it } from 'vitest';
import { aggregateTrafficObservations, assertTrafficSnapshot, buildReadinessCandidates, buildReviewCandidates, DEFAULT_TRAFFIC_CONFIG, relativeSlowdown, taipeiTimestamp, validateTrafficObservation } from '../src/utils/trafficCongestion';
import { compareTrafficScenarios, exportTrafficBriefingCsv, exportTrafficBriefingJson, runTrafficScenario, safeTrafficCsvCell, buildTrafficBriefing } from '../src/utils/trafficCongestionScenarios';
import type { TrafficCongestionSnapshot, TrafficDevice, TrafficEvidenceScope, TrafficObservation } from '../src/types/trafficCongestion';

// Synthetic fixtures exist only in this test file, never in published data.
const device:TrafficDevice={deviceId:'TEST-1',sourceId:'test',roadName:'Synthetic road',corridorId:'a',verifiedLinkId:'link',direction:'east',roadClass:null,location:{latitude:25,longitude:121},detectorType:'VD',laneCount:1,metadataVersion:'metadata-1',geographicScope:'neihu',sourceQualityFlags:[]};
const observation=(observedAt:string,speedKmh:number|null=30):TrafficObservation=>({sourceId:'test',resourceVersion:'edition-1',metadataVersion:'metadata-1',deviceId:'TEST-1',linkId:'link',direction:'east',observedAt,intervalSeconds:3600,speedKmh,flowCount:null,occupancy:null,laneIdentity:'1',laneClass:'general',validationStatus:'valid'});
const days=['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16'];
function history(speed=30, dates=days) {return dates.flatMap(date=>[7,8,9,10,11,12,13,14,15,17,18,19].map(hour=>observation(`${date}T${String(hour).padStart(2,'0')}:00:00+08:00`,hour>=10&&hour<16?50:speed)));}
const aggregate=(rows=history(),dates=days)=>aggregateTrafficObservations(rows,device,dates,3600);
const candidate=()=>buildReviewCandidates([device],aggregate())[0];
const scope:TrafficEvidenceScope={sourceVersions:['test/edition-1'],acceptedDays:days,deviceIds:['TEST-1'],directionLinkIdentities:['link/east'],timeWindow:'morning',population:'weekday',minimumCompleteness:.8,baselineDefinition:'same-day detector/edition/lane offPeak median 10–16',slowdownThreshold:.2};
function snapshot():TrafficCongestionSnapshot{return {schemaVersion:'1.0.0',methodologyVersion:'neihu-traffic-observation-review-v1',configurationVersion:'1.0.0',snapshotId:'test-snapshot',generatedAt:'2026-10-21T00:00:00Z',mode:'readiness',sourceResourceIds:[],sourceSha256:{},observedFrom:null,observedThrough:null,expectedSamplingInterval:null,validSampleCount:0,excludedSampleCount:0,detectorCoverage:1,corridorCoverage:1,directionCoverage:1,observationQuality:[],comparatorAssumptions:[],scenarioEligibility:{performance:false,quality:true,reasons:['no history']},limitations:[],sources:[],devices:[device],corridors:[],observations:[],dailyAggregates:[],candidates:buildReadinessCandidates([device])};}

describe('Taipei traffic temporal and sensor comparability',()=>{
  it('uses Taipei days and explicit timezone, rejecting ambiguous/impossible timestamps',()=>{
    expect(taipeiTimestamp('2026-10-11T23:00:00Z')).toMatchObject({date:'2026-10-12',hour:7,weekday:1});
    expect(taipeiTimestamp('2026-10-12T07:00:00')).toBeNull();expect(taipeiTimestamp('2026-02-30T07:00:00+08:00')).toBeNull();
  });
  it('calculates relative slowdown and rejects unknown or zero baselines',()=>{expect(relativeSlowdown(30,50)).toBe(.4);expect(relativeSlowdown(30,0)).toBeNull();expect(relativeSlowdown(null,50)).toBeNull();expect(relativeSlowdown(0,50)).toBe(1);});
  it('preserves valid documented zero while rejecting sentinels, units and direction mismatches',()=>{
    const valid=observation('2026-10-12T07:00:00+08:00',0);expect(validateTrafficObservation(valid,device)).toEqual([]);
    expect(validateTrafficObservation({...valid,speedKmh:-99,flowCount:-1,occupancy:101,direction:'west'},device)).toEqual(expect.arrayContaining(['invalid_speed','invalid_flow','invalid_occupancy','direction_mismatch']));
    expect(validateTrafficObservation({...valid,metadataVersion:'different'},device)).toContain('metadata_edition_mismatch');
  });
  it('builds non-overlapping complete morning, evening and reference windows',()=>{const result=aggregate();expect(result).toHaveLength(15);expect(result[0]).toMatchObject({timeWindow:'morning',expectedSamples:3,validSamples:3,medianSpeedKmh:30,referenceMedianSpeedKmh:50,observedRelativeSlowdown:.4,eligibleForComparison:true});expect(result.find(a=>a.timeWindow==='evening')?.validSamples).toBe(3);});
  it('counts entirely missing days and never fills with zero',()=>{const result=aggregate(history(30,[days[0]]),days);const absent=result.find(a=>a.date===days[1]&&a.timeWindow==='morning')!;expect(absent).toMatchObject({validSamples:0,missingSamples:3,medianSpeedKmh:null,eligibleForComparison:false});});
  it('excludes duplicate slots conservatively independent of source order',()=>{const rows=history();rows.push({...rows[0],speedKmh:10});expect(aggregate(rows)[0]).toMatchObject({validSamples:2,duplicateSamples:1,eligibleForComparison:false});expect(aggregate(rows)).toEqual(aggregate(rows.reverse()));});
  it('does not use a reference from another day, lane, edition, link or detector',()=>{
    for(const patch of [{resourceVersion:'other'},{laneIdentity:'2'},{linkId:'other'},{deviceId:'other'}]) {
      const rows=history().map(row=>Number(row.observedAt.slice(11,13))>=10&&Number(row.observedAt.slice(11,13))<16?{...row,...patch}:row);
      expect(aggregate(rows).find(a=>a.timeWindow==='morning'&&a.resourceVersion==='edition-1')?.eligibleForComparison).toBe(false);
    }
  });
  it('requires completeness for both same-day peak and reference',()=>{expect(aggregate(history().filter(row=>row.observedAt.slice(11,13)!=='15'&&row.observedAt.slice(11,13)!=='14'))[0].eligibleForComparison).toBe(false);});
  it('rejects off-grid and incompatible sampling periods',()=>{expect(aggregateTrafficObservations([observation(`${days[0]}T07:15:00+08:00`)],device,[days[0]],3600)[0].validSamples).toBe(0);expect(()=>aggregateTrafficObservations([],device,days,0)).toThrow();});
  it('never averages different detectors or infers corridor travel time',()=>{const rows=[...history(),...history(2).map(row=>({...row,deviceId:'other'}))];expect(aggregate(rows)[0].medianSpeedKmh).toBe(30);expect(candidate()).not.toHaveProperty('travelTime');expect(candidate()).not.toHaveProperty('accidentCount');});
});
describe('independent performance and quality tiers',()=>{
  it('gives A only for five eligible weekdays and repeated qualifying slowdown',()=>{expect(candidate().reviewTier).toBe('A');expect(candidate().limitations.join(' ')).toContain('public holidays');});
  it('gives B for repeated slowdown without five weekdays',()=>{expect(buildReviewCandidates([device],aggregate(history(30,days.slice(0,2)),days.slice(0,2)))[0].reviewTier).toBe('B');});
  it('gives C for comparable observations without repeated slowdown',()=>{expect(buildReviewCandidates([device],aggregate(history(49)))[0].reviewTier).toBe('C');});
  it('gives insufficient for a single snapshot/day',()=>{expect(buildReviewCandidates([device],aggregate(history(30,[days[0]]),[days[0]]))[0].reviewTier).toBe('insufficient');});
  it('does not count repeated samples or weekends as five weekdays',()=>{expect(buildReviewCandidates([device],aggregate(history(30,['2026-10-17','2026-10-18']),['2026-10-17','2026-10-18']))[0].reviewTier).toBe('B');});
  it('recomputes configurable completeness and slowdown thresholds',()=>{expect(buildReviewCandidates([device],aggregate(),{...DEFAULT_TRAFFIC_CONFIG,slowdownThreshold:.5})[0].reviewTier).toBe('C');});
  it('rechecks same-day reference coverage when completeness changes without raw reaggregation',()=>{
    const partial=aggregate(history().filter(row=>row.observedAt.slice(11,13)!=='15'));
    expect(buildReviewCandidates([device],partial)[0].reviewTier).toBe('A');
    expect(buildReviewCandidates([device],partial,{...DEFAULT_TRAFFIC_CONFIG,minimumCompleteness:.9})[0].reviewTier).toBe('insufficient');
    const strict=aggregateTrafficObservations(history().filter(row=>row.observedAt.slice(11,13)!=='15'),device,days,3600,{...DEFAULT_TRAFFIC_CONFIG,minimumCompleteness:.9});
    expect(buildReviewCandidates([device],strict)[0].reviewTier).toBe('A');
  });
  it('retains missing-history candidates only for independent quality review',()=>{const candidates=buildReadinessCandidates([{...device,direction:null}]);expect(candidates[0]).toMatchObject({eligible:false,reviewTier:'insufficient',qualityTier:'urgent'});expect(runTrafficScenario(candidates,{strategy:'quality',capacity:5}).selected).toHaveLength(1);expect(runTrafficScenario(candidates,{strategy:'slowdown',capacity:5}).selected).toEqual([]);});
});
describe('deterministic capacity scenarios and evidence scopes',()=>{
  const candidates=Array.from({length:12},(_,index)=>({...candidate(),stableCandidateId:`candidate-${String(index).padStart(2,'0')}`,corridorId:index<10?'a':'b'}));
  it('honors capacity five, ten and unlimited without mutation',()=>{expect(runTrafficScenario(candidates,{strategy:'slowdown',capacity:5}).selected).toHaveLength(5);expect(runTrafficScenario(candidates,{strategy:'slowdown',capacity:10}).selected).toHaveLength(10);expect(runTrafficScenario(candidates,{strategy:'slowdown',capacity:null}).selected).toHaveLength(12);expect(()=>runTrafficScenario(candidates,{strategy:'slowdown',capacity:0})).toThrow();});
  it('ranks ties identically regardless of input order',()=>{expect(runTrafficScenario(candidates,{strategy:'slowdown',capacity:5})).toEqual(runTrafficScenario([...candidates].reverse(),{strategy:'slowdown',capacity:5}));});
  it('balances represented eligible corridors in deterministic rounds',()=>{const result=runTrafficScenario(candidates,{strategy:'balanced',capacity:5});expect(result.selected.slice(0,2).map(c=>c.corridorId)).toEqual(['a','b']);expect(result.representedCorridors).toBe(2);});
  it('compares same scopes, warns on changed editions/days/thresholds and different objectives',()=>{const a=runTrafficScenario(candidates,{strategy:'slowdown',capacity:5});const b=runTrafficScenario(candidates,{strategy:'balanced',capacity:5});expect(compareTrafficScenarios(a,b,scope,{...scope,acceptedDays:[...days].reverse()}).sameEvidenceScope).toBe(true);expect(compareTrafficScenarios(a,b,scope,{...scope,minimumCompleteness:.9}).warnings).toHaveLength(1);expect(compareTrafficScenarios(a,runTrafficScenario(candidates,{strategy:'quality',capacity:5}),scope,scope).sameObjective).toBe(false);});
  it('honestly reports identical selections and empty populations',()=>{const a=runTrafficScenario([],{strategy:'slowdown',capacity:5});expect(a.selected).toEqual([]);expect(compareTrafficScenarios(a,a,scope,scope).identicalSelection).toBe(true);});
});
describe('publication contract and safe briefings',()=>{
  it('does not certify geographic coverage in an exported readiness briefing',()=>{
    const s=snapshot();
    const briefing=buildTrafficBriefing(s,runTrafficScenario(s.candidates,{strategy:'quality',capacity:5}),scope);
    expect(briefing.geographicScope).toContain('geographic scope may be unverified');
    expect(briefing.geographicScope).not.toContain('verified connecting corridors');
    expect(exportTrafficBriefingCsv(briefing)).toContain('geographic scope may be unverified');
  });
  it('accepts honest readiness and rejects incompatible schema, hash and synthetic sources',()=>{expect(()=>assertTrafficSnapshot(snapshot())).not.toThrow();expect(()=>assertTrafficSnapshot({...snapshot(),schemaVersion:'2'})).toThrow();expect(()=>assertTrafficSnapshot({...snapshot(),synthetic:true})).toThrow();expect(()=>assertTrafficSnapshot({...snapshot(),sourceSha256:{bad:'abc'}})).toThrow();expect(()=>assertTrafficSnapshot({...snapshot(),scenarioEligibility:{performance:true,quality:true,reasons:[]}})).toThrow();});
  it('rejects nested synthetic observations and arbitrary historical publication claims',()=>{
    expect(()=>assertTrafficSnapshot({...snapshot(),observations:[{...history()[0],synthetic:true}]})).toThrow();
    expect(()=>assertTrafficSnapshot({...snapshot(),mode:'historical',scenarioEligibility:{performance:true,quality:true,reasons:[]},candidates:[candidate()]})).toThrow();
  });
  it('requires a matching verified source hash and reproducible eligible history',()=>{
    const s=snapshot();s.mode='historical';s.observedFrom=days[0];s.observedThrough=days[4];s.dailyAggregates=aggregate();s.candidates=buildReviewCandidates([device],s.dailyAggregates);s.scenarioEligibility.performance=true;
    const hash='a'.repeat(64);s.sourceSha256={test:hash};s.sources=[{sourceId:'test',resourceId:'test',title:'test',url:'https://example.gov/test',status:'verified_analysis',retrievedAt:s.generatedAt,sha256:hash,resourceVersion:'edition-1',observedFrom:days[0],observedThrough:days[4],limitations:[]}];
    expect(()=>assertTrafficSnapshot(s)).not.toThrow();s.sourceSha256.test='b'.repeat(64);expect(()=>assertTrafficSnapshot(s)).toThrow();
  });
  it('escapes all dangerous spreadsheet prefixes and quotes',()=>{for(const prefix of ['=','+','-','@','  =','\t=','\r=','\n='])expect(safeTrafficCsvCell(`${prefix}formula`)).toMatch(/^"'/);expect(safeTrafficCsvCell('a"b')).toBe('"a""b"');});
  it('exports deterministic provenance-rich quality briefings with unavailable performance explicit',()=>{const s=snapshot();const result=runTrafficScenario(s.candidates,{strategy:'quality',capacity:5});const briefing=buildTrafficBriefing(s,result,scope);expect(exportTrafficBriefingJson(briefing)).toBe(exportTrafficBriefingJson(briefing));expect(JSON.parse(exportTrafficBriefingJson(briefing)).performanceIndicatorsAvailable).toBe(false);expect(exportTrafficBriefingCsv(briefing)).toContain('sourceGap');expect(exportTrafficBriefingCsv(briefing)).toContain('test-snapshot');expect(exportTrafficBriefingCsv(briefing)).toContain('Accident counts do not enter');});
});
