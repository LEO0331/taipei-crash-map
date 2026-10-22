import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { BusCandidate, BusHistoryGates, BusSnapshot } from '../src/types/busService';
import { assessBusCandidate, assessBusHistory, assertBusManifest, assertBusSnapshot, busCandidateId, BUS_HISTORY_REQUIREMENTS, evaluateBusHistory, isSafeBusArtifactPath, parseBusCalendar, parseBusHeadway, parseBusServiceWindow, parseBusTime, verifyBusArtifact } from '../src/utils/busService';
import { buildBusBriefing, compareBusScenarios, exportBusBriefingCsv, exportBusBriefingJson, runBusScenario, safeBusCsvCell } from '../src/utils/busServiceScenarios';

const candidate=(id:string,route='1',issues:string[]=[]):BusCandidate=>({id:busCandidateId('pto',route,id,'0'),routeId:'pto:'+route,mainRouteId:route,variantId:id,variantNameZh:'測試案例',variantNameEn:'Test fixture',direction:'0',operatorIds:['operator'],stopCount:2,issues,sourceId:'pto-native-v6.3',geographicEligibility:'network',evidenceStatus:'limited'});
const gates=Object.fromEntries(BUS_HISTORY_REQUIREMENTS.map(key=>[key,true])) as unknown as BusHistoryGates;
const event=(id:string,timestamp:string)=>({id,candidateId:'pto:1:10:0',stopId:'post-1',serviceDay:'2026-10-21',timestamp,semantics:'actual-departure' as const});
const manifest:unknown=JSON.parse(readFileSync('public/data/bus-service/manifest.json','utf8'));
assertBusManifest(manifest);
const snapshot=JSON.parse(readFileSync('public/data/bus-service/'+manifest.snapshotFile,'utf8')) as BusSnapshot;

describe('bus identity and published time semantics',()=>{
  it('separates source main route variant direction and escapes delimiters',()=>{
    expect(busCandidateId('pto','1','2','0')).not.toBe(busCandidateId('tdx','1','2','0'));
    expect(busCandidateId('pto','1','2','0')).not.toBe(busCandidateId('pto','1','2','1'));
    expect(busCandidateId('pto','a:b','c','0')).not.toBe(busCandidateId('pto','a','b:c','0'));
  });
  it('preserves raw formats and validates headway descriptions without guessing compact ranges',()=>{
    expect(parseBusHeadway('0510')).toMatchObject({raw:'0510',minimumMinutes:null});
    expect(parseBusHeadway('10～15分')).toMatchObject({minimumMinutes:10,maximumMinutes:15});
    expect(parseBusHeadway('15-10').reason).toBe('inverted-range');
    expect(parseBusHeadway('尖峰機動發車').maximumMinutes).toBeNull();
    expect(parseBusHeadway('0').minimumMinutes).toBeNull();
  });
  it('validates weekday and real special dates, never supplies a holiday assumption',()=>{
    expect(parseBusCalendar('0','1')).toMatchObject({kind:'weekday',weekday:1,valid:true});
    expect(parseBusCalendar('1','20240229').valid).toBe(true);
    for(const values of [['1','20250229'],['0','0'],['holiday','1'],['1','20261301']])expect(parseBusCalendar(...values as [string,string]).valid).toBe(false);
  });
  it('handles midnight as published service-day offset while rejecting malformed times',()=>{
    expect(parseBusServiceWindow('23:00','01:30')).toMatchObject({endMinutes:1530,overnight:true,actualObservation:false});
    expect(parseBusTime('25:15')).toMatchObject({minutes:1515,dayOffset:1});
    for(const value of ['48:00','24:60','9:00','no time'])expect(parseBusTime(value).minutes).toBeNull();
    expect(parseBusServiceWindow(null,'01:30').endMinutes).toBeNull();
  });
});
describe('bus review eligibility and deterministic capacity',()=>{
  it('separates independent objectives and preserves limited evidence',()=>{
    const result=assessBusCandidate(candidate('1','1',['undirected-schedule']));
    expect(result).toMatchObject({tier:'B',eligibility:{quality:true,published:false,historical:false,evidenceStatus:'limited'}});
    expect(assessBusCandidate({...candidate('1'),sourceId:undefined}).eligibility.quality).toBe(false);
    expect(assessBusCandidate({...candidate('1'),geographicEligibility:'unverified'}).eligibility.quality).toBe(false);
    expect(assessBusCandidate(candidate('1','1',['route-stop-conflict'])).tier).toBe('A');
  });
  it('broader settings only admit unresolved identity for review',()=>{
    const ambiguous={...candidate('1'),direction:'unknown' as const,issues:['unknown-direction']};
    expect(assessBusCandidate(ambiguous).eligibility.quality).toBe(false);
    expect(assessBusCandidate(ambiguous,true).eligibility).toMatchObject({quality:true,published:false,historical:false,evidenceStatus:'limited'});
    expect(assessBusCandidate({...ambiguous,evidenceStatus:'unverified'},true).eligibility.quality).toBe(false);
  });
  it('uses explicit tiers then stable IDs, capacities 5/10/all, no mutation',()=>{
    const population=Array.from({length:12},(_,i)=>candidate(String(i).padStart(2,'0'),'1',i<6?['sequence-gap']:['undirected-schedule']));
    const original=JSON.stringify(population);
    for(const capacity of [5,10,null] as const){const result=runBusScenario(population,{capacity,strategy:'evidence-gaps'});expect(result.capacityUsed).toBe(capacity??12);expect(result.selected.map(c=>c.id)).toEqual(runBusScenario([...population].reverse(),{capacity,strategy:'evidence-gaps'}).selected.map(c=>c.id));}
    expect(JSON.stringify(population)).toBe(original);
    expect(()=>runBusScenario(population,{capacity:0 as 5,strategy:'balanced'})).toThrow();
  });
  it('balances verified main route identities and explains identical or changed outcomes',()=>{
    const population=[...Array.from({length:6},(_,i)=>candidate(String(i),'1',['sequence-gap'])),...Array.from({length:6},(_,i)=>candidate(String(i),'2',['undirected-schedule']))];
    const first=runBusScenario(population,{capacity:5,strategy:'evidence-gaps',evidenceEdition:'fixture-edition-a'}),second=runBusScenario(population,{capacity:5,strategy:'balanced',evidenceEdition:'fixture-edition-a'});
    expect(first.representedRoutes).toBe(1);expect(second.representedRoutes).toBe(2);
    expect(compareBusScenarios(first,second)).toMatchObject({sameEvidenceScope:true,identicalSelection:false,routeDiversityChange:1});
    expect(compareBusScenarios(first,{...second,config:{...second.config,evidenceEdition:'fixture-edition-b'}}).sameEvidenceScope).toBe(false);
    expect(compareBusScenarios({...first,config:{...first.config,evidenceEdition:undefined}},second).sameEvidenceScope).toBe(false);
    expect(compareBusScenarios(runBusScenario(population,{capacity:null,strategy:'evidence-gaps'}),runBusScenario(population,{capacity:null,strategy:'balanced'})).identicalSelection).toBe(true);
    expect(runBusScenario([],{capacity:5,strategy:'balanced'}).capacityUsed).toBe(0);
    expect(runBusScenario(population,{capacity:5,strategy:'evidence-gaps',objective:'published'}).excluded).toHaveLength(12);
  });
  it('compares changed eligibility as sensitivity, including excluded reasons',()=>{
    const population=[{...candidate('1'),direction:'unknown' as const,issues:['unknown-direction']}];
    const first=runBusScenario(population,{capacity:5,strategy:'evidence-gaps'}),second=runBusScenario(population,{capacity:5,strategy:'evidence-gaps',includeAmbiguous:true});
    expect(first.excluded[0].eligibility.reasons).toContain('ambiguous-identity');
    expect(compareBusScenarios(first,second)).toMatchObject({sameEvidenceScope:false,eligibilityChange:1});
  });
});
describe('historical observations fail closed independently',()=>{
  it('requires every actual operational evidence gate',()=>{
    expect(assessBusHistory().eligible).toBe(false);
    for(const key of BUS_HISTORY_REQUIREMENTS)expect(assessBusHistory({...gates,[key]:false}).reasons).toContain('history-gate:'+key);
    expect(evaluateBusHistory([],{}).intervalsMinutes).toBeNull();
  });
  it('rejects estimates GPS malformed dates timezone and conflicting event IDs',()=>{
    const first=event('a','2026-10-21T23:50:00+08:00'),second=event('b','2026-10-22T00:10:00+08:00');
    for(const invalid of [{...second,semantics:'estimate' as const},{...second,semantics:'position' as const},{...second,timestamp:'2026-10-22T00:10:00'},{...second,timestamp:'2026-02-30T00:10:00+08:00'},{...second,serviceDay:'2026-02-30'},{...second,candidateId:'route-display-name'},{...second,id:'a'}])expect(evaluateBusHistory([first,invalid],gates).eligible).toBe(false);
  });
  it('deduplicates exact actual events and retains service-day midnight grouping',()=>{
    const first=event('a','2026-10-21T23:50:00+08:00'),second=event('b','2026-10-22T00:10:00+08:00');
    expect(evaluateBusHistory([second,first,first],gates)).toMatchObject({eligible:true,intervalsMinutes:[20]});
    expect(evaluateBusHistory([first,{...second,serviceDay:'2026-10-22'}],gates).eligible).toBe(false);
  });
});
describe('production integrity and briefing safety',()=>{
  it('accepts sourced production records and rejects schema version identities hashes and nested synthetic flags',()=>{
    expect(()=>assertBusSnapshot(snapshot)).not.toThrow();
    for(const change of [(s:BusSnapshot)=>{s.summary.methodologyVersion='wrong' as typeof s.summary.methodologyVersion;},(s:BusSnapshot)=>{s.sources[0].sha256='bad';},(s:BusSnapshot)=>{s.candidates[0].routeId='unknown';},(s:BusSnapshot)=>{(s.sources[0] as unknown as Record<string,unknown>).extra={synthetic:true};},(s:BusSnapshot)=>{s.summary.candidateCount++;}]){const copy=structuredClone(snapshot);change(copy);expect(()=>assertBusSnapshot(copy)).toThrow();}
    for(const path of ['../a.json','/a.json','a/../b.json','https://a/b.json'])expect(isSafeBusArtifactPath(path)).toBe(false);
    expect(()=>assertBusManifest({...manifest,schemaVersion:'future'})).toThrow();
  });
  it('verifies actual bytes and rejects changed bytes or digest',async()=>{
    const bytes=readFileSync('public/data/bus-service/'+manifest.snapshotFile);const buffer=Uint8Array.from(bytes).buffer;
    const contract={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
    await expect(verifyBusArtifact(buffer,contract)).resolves.toHaveProperty('summary.snapshotId',snapshot.summary.snapshotId);
    await expect(verifyBusArtifact(buffer,{...contract,sha256:'0'.repeat(64)})).rejects.toThrow('SHA-256');
    await expect(verifyBusArtifact(buffer,{...contract,bytes:1})).rejects.toThrow('size');
  });
  it('exports actual selected candidates with provenance and neutralizes formula injection',()=>{
    const result=runBusScenario(snapshot.candidates,{capacity:5,strategy:'balanced'}),briefing=buildBusBriefing(snapshot,result);
    expect(JSON.parse(exportBusBriefingJson(briefing)).scenario.selected).toEqual(result.selected);
    const csv=exportBusBriefingCsv(briefing);expect(csv).toContain(snapshot.sources[0].sha256);expect(csv).toContain(result.selected[0].id);
    for(const formula of ['=SUM(A1)',' +1','\t@evil','-1'])expect(safeBusCsvCell(formula)).toMatch(/^"'/);
    expect(safeBusCsvCell('a"b')).toBe('"a""b"');
  });
});
