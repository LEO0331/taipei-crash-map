import type { BusActualObservation, BusCandidate, BusEligibility, BusHistoryGates, BusManifest, BusReviewedCandidate, BusSnapshot } from '../types/busService';

export const BUS_METHOD = 'bus-network-service-evidence-review-v1';
export const compareBusIds = (a:string,b:string) => a < b ? -1 : a > b ? 1 : 0;
export function busCandidateId(source:string,main:string,variant:string,direction:string):string {
  return [source,main,variant,direction].map(encodeURIComponent).join(':');
}
export function parseBusTime(raw:unknown):{raw:unknown; minutes:number|null; dayOffset:number|null; reason:string|null} {
  if(typeof raw!=='string')return {raw,minutes:null,dayOffset:null,reason:'missing-time'};
  const match=/^(\d{2}):?(\d{2})$/.exec(raw.trim());
  if(!match)return {raw,minutes:null,dayOffset:null,reason:'invalid-time'};
  const hour=Number(match[1]),minute=Number(match[2]);
  if(hour>47||minute>59)return {raw,minutes:null,dayOffset:null,reason:'invalid-time'};
  return {raw,minutes:hour*60+minute,dayOffset:Math.floor(hour/24),reason:null};
}
export function parseBusServiceWindow(start:unknown,end:unknown) {
  const first=parseBusTime(start),last=parseBusTime(end);
  const endMinutes=first.minutes===null||last.minutes===null?null:last.minutes<first.minutes?last.minutes+1440:last.minutes;
  return {start:first,end:last,endMinutes,overnight:endMinutes!==null&&endMinutes>=1440,timezone:'Asia/Taipei',actualObservation:false};
}
export function parseBusHeadway(raw:unknown) {
  const text=typeof raw==='string'?raw.trim():typeof raw==='number'?String(raw):'';
  const single=/^([1-9]\d{0,2})$/.exec(text),range=/^([1-9]\d{0,2})\s*[-~～–至]\s*([1-9]\d{0,2})(?:\s*(?:分|分鐘|min))?$/.exec(text);
  const low=single?Number(single[1]):range?Number(range[1]):null;
  const high=single?low:range?Number(range[2]):null;
  return {raw,minimumMinutes:low!==null&&high!==null&&low<=high?low:null,maximumMinutes:low!==null&&high!==null&&low<=high?high:null,reason:low===null?'free-text-or-ambiguous-format':high!==null&&low>high?'inverted-range':null};
}
export function parseBusCalendar(dateType:unknown,dateValue:unknown) {
  const type=String(dateType),value=String(dateValue??'');
  if(type==='0'&&/^[1-7]$/.test(value))return {raw:{dateType,dateValue},kind:'weekday' as const,weekday:Number(value),date:null,valid:true};
  if(type==='1'&&/^\d{8}$/.test(value)) {
    const iso=value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8),date=new Date(iso+'T00:00:00Z');
    if(Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===iso)return {raw:{dateType,dateValue},kind:'special-date' as const,weekday:null,date:iso,valid:true};
  }
  return {raw:{dateType,dateValue},kind:'unresolved' as const,weekday:null,date:null,valid:false};
}
export const BUS_HISTORY_REQUIREMENTS: (keyof BusHistoryGates)[] = ['officialAccessible','verifiedIdentity','actualEventSemantics','timezone','serviceDay','stableCrosswalk','comparableWindows','duplicateHandling','completeness','exceptions','outageHandling'];
export function assessBusHistory(gates?:Partial<BusHistoryGates>) {
  const reasons=BUS_HISTORY_REQUIREMENTS.filter(key=>gates?.[key]!==true).map(key=>'history-gate:'+key);
  return {eligible:reasons.length===0,reasons};
}
export type BusActualEvent = BusActualObservation;
const validCivilDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
function validActualTimestamp(value:string):boolean {
  const match=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if(!match||!validCivilDate(match[1])||Number(match[2])>23||Number(match[3])>59||Number(match[4])>59)return false;
  if(match[5]!=='Z'&&(Number(match[5].slice(1,3))>14||Number(match[5].slice(4,6))>59))return false;
  return Number.isFinite(Date.parse(value));
}
export function evaluateBusHistory(events:BusActualEvent[],gates:Partial<BusHistoryGates>) {
  const status=assessBusHistory(gates);
  if(!status.eligible)return {...status,intervalsMinutes:null};
  const seen=new Set<string>();
  const eventIdentities=new Map<string,string>();
  let invalidEvents=0;
  const accepted=events.filter(event=>{
    if(!['actual-arrival','actual-departure'].includes(event.semantics)||!event.id||!/^[^:]+:[^:]+:[^:]+:(?:0|1)$/.test(event.candidateId)||!event.stopId||!validCivilDate(event.serviceDay)||!validActualTimestamp(event.timestamp)){invalidEvents++;return false;}
    const key=JSON.stringify([event.id,event.candidateId,event.stopId,event.serviceDay,event.timestamp,event.semantics]);
    if(eventIdentities.has(event.id)&&eventIdentities.get(event.id)!==key){invalidEvents++;return false;}
    eventIdentities.set(event.id,key);
    if(seen.has(key))return false;seen.add(key);return true;
  });
  if(invalidEvents || accepted.length<2)return {eligible:false,reasons:[invalidEvents?'invalid-or-nonactual-events':'insufficient-comparable-events'],intervalsMinutes:null};
  const groups=new Map<string,number[]>();
  for(const event of accepted){const key=JSON.stringify([event.candidateId,event.stopId,event.serviceDay,event.semantics]);const group=groups.get(key)??[];group.push(Date.parse(event.timestamp));groups.set(key,group);}
  const intervalsMinutes:number[]=[];
  for(const times of groups.values()){times.sort((a,b)=>a-b);for(let i=1;i<times.length;i++)if(times[i]>times[i-1])intervalsMinutes.push((times[i]-times[i-1])/60000);}
  return {eligible:intervalsMinutes.length>0,reasons:intervalsMinutes.length?[]:['insufficient-comparable-events'],intervalsMinutes:intervalsMinutes.length?intervalsMinutes:null};
}
const primaryIssues=new Set(['missing-stop','broken-route-stop','route-stop-conflict','missing-location','invalid-coordinate','unknown-direction','ambiguous-route','duplicate-sequence','sequence-gap','missing-sequence','source-version-mismatch','orphan-variant']);
const publicationIssues=new Set(['undirected-schedule','schedule-conflict','calendar-ambiguity','missing-timetable','invalid-time','inverted-headway']);
export function assessBusCandidate(candidate:BusCandidate,includeAmbiguous=false):BusReviewedCandidate {
  const ambiguous=candidate.direction==='unknown'||candidate.issues.some(issue=>['ambiguous-route','orphan-variant','unknown-direction','source-version-mismatch'].includes(issue));
  const unverified=!candidate.sourceId||!['verified','limited'].includes(candidate.evidenceStatus??'')||![candidate.id,candidate.mainRouteId,candidate.routeId,candidate.variantId].every(Boolean);
  const outside=candidate.geographicEligibility!=='network';
  const quality=!outside&&!unverified&&(!ambiguous||includeAmbiguous);
  const reasons=[...(outside?['out-of-scope']:[]),...(unverified?['source-not-verified']:[]),...(ambiguous?['ambiguous-identity']:[]),'variant-schedules-have-no-verified-direction','historical-actual-events-unavailable'];
  const eligibility:BusEligibility={quality,published:false,historical:false,reasons,evidenceStatus:unverified?'unverified':ambiguous||candidate.issues.length||candidate.evidenceStatus==='limited'?'limited':'verified'};
  const tier=candidate.issues.some(issue=>primaryIssues.has(issue))?'A':candidate.issues.some(issue=>publicationIssues.has(issue))?'B':'C';
  return {...candidate,tier,eligibility,reviewQuestion:tier==='A'?'Verify source identity and ordered route-stop relationships.':tier==='B'?'Clarify published schedule direction and calendar applicability.':'Review network documentation and geometry provenance.',unknownMeasurements:['passenger-demand','actual-waiting-time','executed-trips','reliability','walking-coverage']};
}

const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const strings=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(item=>typeof item==='string');
const finiteCount=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>=0;
export function isSafeBusArtifactPath(value:unknown):value is string {
  return typeof value==='string'&&/^[a-zA-Z0-9/_.,-]+\.json$/.test(value)&&!value.startsWith('/')&&!value.split('/').some(part=>part==='..'||part==='.'||!part);
}
function rejectSynthetic(value:unknown):void {
  if(Array.isArray(value)){value.forEach(rejectSynthetic);return;}
  if(!isRecord(value))return;
  for(const [key,item] of Object.entries(value)) {
    if((key==='synthetic'&&item===true)||(key==='fixture'&&item===true)||(key==='sourceType'&&['synthetic','fixture','test'].includes(String(item))))throw new Error('Synthetic/test records cannot be production bus evidence');
    rejectSynthetic(item);
  }
}
export function assertBusManifest(value:unknown):asserts value is BusManifest {
  if(!isRecord(value)||value.schemaVersion!=='1.0.0'||typeof value.snapshotId!=='string'||!/^pto-bus-[a-f0-9]{16}$/.test(value.snapshotId)||!isSafeBusArtifactPath(value.snapshotFile)||!isRecord(value.files))throw new Error('Invalid bus manifest');
  for(const [file,contract] of Object.entries(value.files))if(!isSafeBusArtifactPath(file)||!file.startsWith(value.snapshotId+'/')||!isRecord(contract)||typeof contract.sha256!=='string'||! /^[a-f0-9]{64}$/.test(contract.sha256)||!finiteCount(contract.bytes)||contract.bytes===0)throw new Error('Invalid bus artifact integrity contract');
  for(const file of [value.snapshotFile,value.summaryFile,value.qualityReportFile,value.sourceHealthFile].filter(file=>file!==undefined))if(typeof file!=='string'||!value.files[file])throw new Error('Unlisted bus artifact');
}
export function assertBusSnapshot(value:unknown):asserts value is BusSnapshot {
  rejectSynthetic(value);
  if(!isRecord(value)||!isRecord(value.summary)||value.summary.schemaVersion!=='1.0.0'||value.summary.methodologyVersion!==BUS_METHOD||typeof value.summary.snapshotId!=='string'||!/^pto-bus-[a-f0-9]{16}$/.test(value.summary.snapshotId)||typeof value.summary.generatedAt!=='string'||!Number.isFinite(Date.parse(value.summary.generatedAt))||!Array.isArray(value.routes)||!Array.isArray(value.candidates)||!Array.isArray(value.sources))throw new Error('Invalid bus snapshot schema/version');
  const countFields=['routeRecords','mainRouteIds','variantIds','operatorAssociations','stopPosts','physicalLocations','pathOccurrences','duplicateStopIds','missingMainRouteReferences','missingVariantReferences','missingStopReferences','missingLocationReferences','invalidStopCoordinates','headwayRecords','departureRecords','shapeRecords','specialScheduleEntries','candidateCount','geometryMatchedCandidates'];
  if(countFields.some(key=>!finiteCount(value.summary && (value.summary as Record<string,unknown>)[key]))||value.summary.historicalPerformanceEligible!==false||value.summary.publishedServiceDirectionEligible!==0||!strings(value.summary.historicalReasons)||!strings(value.summary.limitations)||typeof value.summary.geographicScope!=='string')throw new Error('Invalid bus inventory summary');
  const routes=new Set<string>(),candidateIds=new Set<string>();
  for(const route of value.routes){
    if(!isRecord(route)||!['id','mainRouteId','nameZh','nameEn'].every(key=>typeof route[key]==='string')||route.id!=='pto:'+route.mainRouteId||routes.has(String(route.id))||!isSafeBusArtifactPath(route.detailFile)||!strings(route.operatorIds)||!strings(route.operatorNames)||!['variantCount','directionCount','stopOccurrenceCount','issueCount'].every(key=>finiteCount(route[key])))throw new Error('Invalid bus route identity');
    routes.add(String(route.id));
  }
  for(const candidate of value.candidates){
    if(!isRecord(candidate)||!['id','routeId','mainRouteId','variantId','variantNameZh','variantNameEn','sourceId'].every(key=>typeof candidate[key]==='string')||!routes.has(String(candidate.routeId))||candidate.routeId!=='pto:'+candidate.mainRouteId||candidate.id!==busCandidateId('pto',String(candidate.mainRouteId),String(candidate.variantId),String(candidate.direction))||candidateIds.has(String(candidate.id))||!['0','1','unknown'].includes(String(candidate.direction))||!strings(candidate.operatorIds)||!strings(candidate.issues)||!finiteCount(candidate.stopCount)||!['verified','limited'].includes(String(candidate.evidenceStatus))||candidate.geographicEligibility!=='network')throw new Error('Invalid bus candidate relationship');
    candidateIds.add(String(candidate.id));
  }
  if(value.summary.mainRouteIds!==routes.size||value.summary.candidateCount!==candidateIds.size)throw new Error('Bus summary identity counts disagree');
  const sourceIds=new Set<string>();
  for(const source of value.sources){
    if(!isRecord(source)||typeof source.sourceId!=='string'||sourceIds.has(source.sourceId)||typeof source.url!=='string'||typeof source.sha256!=='string'||! /^[a-f0-9]{64}$/.test(source.sha256)||!['verified','limited'].includes(String(source.status))||typeof source.acquiredAt!=='string'||!Number.isFinite(Date.parse(source.acquiredAt))||!(source.sourceUpdatedAt===null||typeof source.sourceUpdatedAt==='string')||!finiteCount(source.recordCount)||!strings(source.limitations))throw new Error('Invalid bus source provenance');
    const url=new URL(source.url);if(url.protocol!=='https:'||url.username||url.password||url.hostname!=='tcgbusfs.blob.core.windows.net'||!url.pathname.startsWith('/blobbus/'))throw new Error('Invalid official production source URL');
    sourceIds.add(source.sourceId);
  }
  if(!['Route','Stop','PathDetail','StopLocation'].every(id=>sourceIds.has(id)))throw new Error('Required network provenance missing');
}
export async function verifyBusArtifact(bytes:ArrayBuffer,contract:{bytes:number;sha256:string}) {
  if(bytes.byteLength!==contract.bytes)throw new Error('Bus artifact size mismatch');
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(hash!==contract.sha256)throw new Error('Bus artifact SHA-256 mismatch');
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}
