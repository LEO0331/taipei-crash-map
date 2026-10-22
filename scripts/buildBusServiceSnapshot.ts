import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { BusCandidate, BusDirection, BusRouteDetail, BusRouteIndex, BusSnapshot, BusSource, BusSummary } from '../src/types/busService';
import { parseBusCalendar, parseBusTime } from '../src/utils/busService';
import { auditBusServiceSources } from './auditBusServiceSources';
import { atomicJson, immutableWrite, BUS_OUTPUT_DIR, sha256, busCoordinate, validBusWkt, type RawRecord } from './busServiceSources';
const string = (v: unknown) => v == null ? '' : String(v);
const sortedUnique = (values: string[]) => [...new Set(values)].sort();
const direction = (v: unknown): BusDirection => v === '0' || v === '1' ? v : 'unknown';
const pick = (row:RawRecord,keys:string[]) => Object.fromEntries(keys.filter(key=>key in row).map(key=>[key,row[key]]));
const routeFields=['Id','NId','providerId','providerName','nameZh','nameEn','aliasName','pathAttributeId','pathAttributeNId','pathAttributeName','pathAttributeEname','buildPeriod','routeType','departureZh','departureEn','destinationZh','destinationEn','realSequence','distance','goFirstBusTime','backFirstBusTime','goLastBusTime','backLastBusTime','busTimeDesc','peakHeadway','offPeakHeadway','headwayDesc','holidayGoFirstBusTime','holidayBackFirstBusTime','holidayGoLastBusTime','holidayBackLastBusTime','holidayBusTimeDesc','holidayPeakHeadway','holidayOffPeakHeadway','holidayHeadwayDesc','genus'];
export async function buildBusServiceSnapshot(outputDir = BUS_OUTPUT_DIR, rawDir?: string) {
  const { manifest, records, report } = await auditBusServiceSources(rawDir);
  const snapshotId = `pto-bus-${sha256(JSON.stringify(manifest.sources.map(s=>[s.id,s.sha256]))).slice(0,16)}`;
  const edition = snapshotId;
  const files: Record<string,{sha256:string;bytes:number}> = {};
  const publish = async (file: string, data: unknown) => {
    const bytes = JSON.stringify(data)+'\n'; files[file]={sha256:sha256(bytes),bytes:Buffer.byteLength(bytes)};
    await immutableWrite(path.join(outputDir,file),bytes);
  };
  const publishNamed = async (name:string, data:unknown) => { const file=`${edition}/${name}-${sha256(JSON.stringify(data)+'\n')}.json`;await publish(file,data);return file; };
  const grouped = new Map<string, RawRecord[]>();
  for (const row of records.Route) { const id=string(row.Id); grouped.set(id,[...(grouped.get(id)??[]),row]); }
  const stopMap = new Map(records.Stop.map(r=>[string(r.Id),r])); const locationMap = new Map(records.StopLocation.map(r=>[string(r.id),r]));
  const variantIds = new Set(records.Route.map(r=>string(r.pathAttributeId)));
  const orphanPaths = records.PathDetail.filter(r=>!variantIds.has(string(r.pathAttributeId)));
  const routes: BusRouteIndex[]=[]; const candidates: BusCandidate[]=[];
  for (const [mainRouteId, raw] of [...grouped.entries()].sort(([a],[b])=>a.localeCompare(b))) {
    const routeId=`pto:${mainRouteId}`; const variantRows=new Map<string,RawRecord[]>();
    for(const row of raw){const id=string(row.pathAttributeId);variantRows.set(id,[...(variantRows.get(id)??[]),row]);}
    const detail:BusRouteDetail={routeId,candidates:[],stops:[],schedules:[],shapes:[],routeRaw:raw.map(row=>pick(row,routeFields))};
    for(const [variantId,vr] of [...variantRows.entries()].sort(([a],[b])=>a.localeCompare(b))){
      const variantSchedules=[...records.SemiTimeTable.filter(r=>string(r.PathAttributeId)===variantId),...records.TimeTable.filter(r=>string(r.PathAttributeId)===variantId)];
      const paths=records.PathDetail.filter(r=>string(r.pathAttributeId)===variantId);
      const groups=new Map<BusDirection,RawRecord[]>();
      for(const row of paths){const stop=stopMap.get(string(row.stopId));const d=direction(stop?.goBack);groups.set(d,[...(groups.get(d)??[]),row]);}
      if(!groups.size)groups.set('unknown',[]);
      for(const [d,rows] of [...groups.entries()].sort(([a],[b])=>a.localeCompare(b))){
        const issues:string[]=[]; if(d==='unknown')issues.push('unknown-direction');if(!rows.length)issues.push('missing-stop');
        if(new Set(records.Route.filter(r=>string(r.pathAttributeId)===variantId).map(r=>string(r.Id))).size>1)issues.push('ambiguous-route');
        const sequences=rows.map(r=>Number(r.sequenceNo)).sort((a,b)=>a-b);
        if(new Set(sequences).size!==sequences.length)issues.push('duplicate-sequence');
        if(sequences.some((n,i)=>!Number.isInteger(n)||n<0||(i>0&&n>sequences[i-1]+1)))issues.push('sequence-gap');
        for(const row of rows.sort((a,b)=>Number(a.sequenceNo)-Number(b.sequenceNo)||string(a.id).localeCompare(string(b.id)))){
          const stop=stopMap.get(string(row.stopId));if(!stop){issues.push('missing-stop');continue;}
          if(string(stop.routeId)!==mainRouteId){issues.push('broken-route-stop');continue;}
          const location=locationMap.get(string(stop.stopLocationId));if(!location)issues.push('missing-location');
          const lat=busCoordinate(stop.latitude,90),lon=busCoordinate(stop.longitude,180);const valid=lat!==null&&lon!==null;
          if(!valid)issues.push('invalid-coordinate');
          detail.stops.push({occurrenceId:`pto:path:${string(row.id)}`,variantId,direction:d,sequence:Number(row.sequenceNo),stopId:string(row.stopId),stopLocationId:location?string(stop.stopLocationId):null,nameZh:string(stop.nameZh),nameEn:string(stop.nameEn),lat:valid?lat:null,lon:valid?lon:null});
        }
        // Only exact subsidiary ID+main ID+direction shapes are accepted for a variant.
        const shapes=records.BusShape.filter(r=>string(r.RouteID)===mainRouteId&&string(r.SubRouteID)===variantId&&string(r.GoBack)===d);
        if(!shapes.length)issues.push('missing-geometry');
        if(shapes.some(r=>!validBusWkt(r.wkt)))issues.push('invalid-geometry');
        if(records.SemiTimeTable.some(r=>string(r.PathAttributeId)===variantId)||records.TimeTable.some(r=>string(r.PathAttributeId)===variantId))issues.push('undirected-schedule');
        if(variantSchedules.some(r=>!parseBusCalendar(r.DateType,r.DateValue).valid))issues.push('calendar-ambiguity');
        if(variantSchedules.some(r=>(r.DepartureTime!==undefined?[r.DepartureTime]:[r.StartTime,r.EndTime]).some(t=>parseBusTime(t).minutes===null)))issues.push('invalid-time');
        if(variantSchedules.some(r=>r.LongHeadway!==undefined&&(!/^\d+$/.test(string(r.LongHeadway))||!/^\d+$/.test(string(r.LowHeadway))||Number(r.LongHeadway)<Number(r.LowHeadway))))issues.push('inverted-headway');
        const candidate:BusCandidate={id:`pto:${mainRouteId}:${variantId}:${d}`,routeId,mainRouteId,variantId,variantNameZh:string(vr[0].pathAttributeName),variantNameEn:string(vr[0].pathAttributeEname),direction:d,operatorIds:sortedUnique(vr.map(r=>string(r.providerId))),stopCount:rows.length,issues:sortedUnique(issues),sourceId:'PathDetail',geographicEligibility:'network',evidenceStatus:'limited'};
        detail.candidates.push(candidate);candidates.push(candidate);
      }
      for(const row of records.SemiTimeTable.filter(r=>string(r.PathAttributeId)===variantId))detail.schedules.push({kind:'headway',variantId,raw:pick(row,['Id','PathAttributeId','StartTime','EndTime','LongHeadway','LowHeadway','DateType','DateValue'])});
      for(const row of records.TimeTable.filter(r=>string(r.PathAttributeId)===variantId))detail.schedules.push({kind:'departure',variantId,raw:pick(row,['Id','PathAttributeId','DateType','DateValue','DepartureTime','IsLastBus'])});
    }
    // Main-route geometry remains explicitly main-level; never copied as a subsidiary shape.
    detail.shapes=records.BusShape.filter(r=>string(r.RouteID)===mainRouteId).map(r=>({mainRouteId,variantId:Number(r.SubRouteID)===-1?null:string(r.SubRouteID),direction:string(r.GoBack),wkt:string(r.wkt),sourceUpdatedAt:string(r.utime)||null}));
    const serialized=JSON.stringify(detail)+'\n';const detailFile=`${edition}/details/${sha256(serialized)}.json`;await publish(detailFile,detail);
    routes.push({id:routeId,mainRouteId,nameZh:string(raw[0].nameZh),nameEn:string(raw[0].nameEn),operatorIds:sortedUnique(raw.map(r=>string(r.providerId))),operatorNames:sortedUnique(raw.map(r=>string(r.providerName))),variantCount:variantRows.size,directionCount:detail.candidates.length,stopOccurrenceCount:detail.stops.length,issueCount:detail.candidates.reduce((n,c)=>n+c.issues.length,0),detailFile});
  }
  const sources:BusSource[]=manifest.sources.map(s=>({sourceId:s.id,url:s.url,status:['Route','Stop','StopLocation','PathDetail'].includes(s.id)?'verified':'limited',sha256:s.sha256,acquiredAt:s.retrievedAt,sourceUpdatedAt:s.sourceUpdatedAt,recordCount:s.recordCount,limitations:s.id==='BusShape'?['Row update age differs; main and subsidiary shapes kept distinct.']:['Published network/schedule inventory; not actual operational history.']}));
  const summary:BusSummary={schemaVersion:'1.0.0',snapshotId,generatedAt:manifest.sources.map(s=>s.retrievedAt).sort().at(-1)!,methodologyVersion:'bus-network-service-evidence-review-v1',...report,candidateCount:candidates.length,geometryMatchedCandidates:candidates.filter(c=>!c.issues.includes('missing-geometry')).length,publishedServiceDirectionEligible:0,geographicScope:'PTO network with cross-border stops; no district coverage assertion',limitations:['Timetable direction absent: variant-level published schedules retained without assigning direction.','Main-route first/last text retained; not duplicated across subsidiaries.','No historical performance eligible.','Missing variants retained in quality report, excluded from verified candidate inventory.']};
  const snapshot:BusSnapshot={summary,routes,candidates,sources};
  const snapshotFile=await publishNamed('snapshot',snapshot),summaryFile=await publishNamed('summary',summary),qualityReportFile=await publishNamed('quality-report',{...report,orphanPaths}),sourceHealthFile=await publishNamed('source-health',{snapshotId,sources,provenance:manifest.sources});
  // Every artifact is complete and content-addressed before root pointer replaces last good edition.
  await atomicJson(path.join(outputDir,'manifest.json'),{schemaVersion:'1.0.0',snapshotId,snapshotFile,summaryFile,qualityReportFile,sourceHealthFile,files});
  console.log(JSON.stringify({snapshotId,routes:routes.length,candidates:candidates.length,publicBytes:Object.values(files).reduce((n,f)=>n+f.bytes,0),snapshotBytes:files[snapshotFile].bytes}));
  return snapshot;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) buildBusServiceSnapshot().catch(error=>{console.error(String(error));process.exitCode=1;});
