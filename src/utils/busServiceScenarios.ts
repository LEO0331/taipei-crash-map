import type { BusCandidate, BusScenarioConfig, BusScenarioResult, BusSnapshot } from '../types/busService';
import { assessBusCandidate, BUS_METHOD, compareBusIds } from './busService';

export function runBusScenario(candidates:BusCandidate[],config:BusScenarioConfig):BusScenarioResult {
  if(config.capacity!==null&&config.capacity!==5&&config.capacity!==10)throw new Error('Capacity must be 5, 10 or null');
  const population=candidates.filter(candidate=>(!config.routeId||candidate.routeId===config.routeId)&&(!config.variantId||candidate.variantId===config.variantId)&&(!config.direction||candidate.direction===config.direction)).map(candidate=>assessBusCandidate(candidate,config.includeAmbiguous));
  const objective=config.objective??'quality';
  const order=(a:typeof population[number],b:typeof population[number])=>({A:0,B:1,C:2}[a.tier]-{A:0,B:1,C:2}[b.tier])||compareBusIds(a.id,b.id);
  const eligible=population.filter(candidate=>candidate.eligibility[objective]).sort(order);
  const excluded=population.filter(candidate=>!candidate.eligibility[objective]).sort((a,b)=>compareBusIds(a.id,b.id));
  const capacity=config.capacity??eligible.length;
  let selected=eligible.slice(0,capacity);
  if(config.strategy==='balanced') {
    // Routes enter in their best candidate's priority order. Round-robin preserves diversity without invented geography.
    const groups=new Map<string,typeof eligible>();
    for(const candidate of eligible){const group=groups.get(candidate.routeId)??[];group.push(candidate);groups.set(candidate.routeId,group);}
    selected=[];
    for(let round=0;selected.length<capacity;round++) {let added=false;for(const group of groups.values()){if(group[round]&&selected.length<capacity){selected.push(group[round]);added=true;}}if(!added)break;}
  }
  return {config:{...config},population:population.length,eligible,excluded,selected,capacityUsed:selected.length,representedRoutes:new Set(selected.map(candidate=>candidate.routeId)).size,representedVariants:new Set(selected.map(candidate=>JSON.stringify([candidate.routeId,candidate.variantId]))).size,geographicRepresentation:'Official network scope includes cross-border services; district assignments unavailable.',assumptions:['Investigation priorities do not rate bus service or passenger harm.','Main route diversity uses verified source identities; no district diversity is claimed.','Broader inclusion permits ambiguity review only and never verifies an ambiguous join.','Published variant schedules cannot be assigned to directions.']};
}
export function compareBusScenarios(first:BusScenarioResult,second:BusScenarioResult) {
  const scope=(result:BusScenarioResult)=>JSON.stringify({evidenceEdition:result.config.evidenceEdition??null,routeId:result.config.routeId??null,variantId:result.config.variantId??null,direction:result.config.direction??null,includeAmbiguous:result.config.includeAmbiguous??false,objective:result.config.objective??'quality',population:[...result.eligible,...result.excluded].map(candidate=>({id:candidate.id,issues:candidate.issues,eligibility:candidate.eligibility})).sort((a,b)=>compareBusIds(a.id,b.id))});
  const firstIds=new Set(first.selected.map(candidate=>candidate.id)),secondIds=new Set(second.selected.map(candidate=>candidate.id));
  const addedIds=[...secondIds].filter(id=>!firstIds.has(id)).sort(compareBusIds),removedIds=[...firstIds].filter(id=>!secondIds.has(id)).sort(compareBusIds);
  const identicalSelection=!addedIds.length&&!removedIds.length,sameEvidenceScope=!!first.config.evidenceEdition&&!!second.config.evidenceEdition&&scope(first)===scope(second);
  return {sameEvidenceScope,identicalSelection,addedIds,removedIds,populationChange:second.population-first.population,eligibilityChange:second.eligible.length-first.eligible.length,routeDiversityChange:second.representedRoutes-first.representedRoutes,warnings:sameEvidenceScope?[]:['Evidence population or eligibility assumptions differ; changes are sensitivity results.'],explanation:identicalSelection?'Both strategies select the same candidate set under this scope and capacity.':'Route diversity and evidence-tier order produce different investigation selections.'};
}
export function buildBusBriefing(snapshot:BusSnapshot,result:BusScenarioResult,comparison?:ReturnType<typeof compareBusScenarios>,context?:{filters?:Record<string,unknown>;sensitivity?:unknown}) {
  return {title:'Bus network and published-service review / 公車路網與服務查核',methodologyVersion:BUS_METHOD,snapshot:snapshot.summary,sources:snapshot.sources,objective:result.config.objective??'quality',scenario:result,comparison:comparison??null,filters:context?.filters??{routeId:result.config.routeId??null,variantId:result.config.variantId??null,direction:result.config.direction??null},sensitivity:context?.sensitivity??null,limitations:['Inventory and published dispatch information are not operational performance.','Actual historical observation unavailable.','No demand, shortage, population-coverage or passenger-wait score is calculated.']};
}
export type BusBriefing=ReturnType<typeof buildBusBriefing>;
export const exportBusBriefingJson=(briefing:BusBriefing)=>JSON.stringify(briefing,null,2);
export function safeBusCsvCell(value:unknown):string {
  let text=value===null||value===undefined?'':String(value);
  if(/^[\s\u0000-\u001f]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}
export function exportBusBriefingCsv(briefing:BusBriefing):string {
  const rows:unknown[][]=[['section','key','value'],['briefing','methodology',briefing.methodologyVersion],['briefing','snapshot',JSON.stringify(briefing.snapshot)],['briefing','config',JSON.stringify(briefing.scenario.config)],['briefing','comparison',JSON.stringify(briefing.comparison)],['briefing','filters',JSON.stringify(briefing.filters)],['briefing','sensitivity',JSON.stringify(briefing.sensitivity)]];
  for(const source of briefing.sources)rows.push(['source',source.sourceId,JSON.stringify(source)]);
  for(const candidate of briefing.scenario.selected)rows.push(['selected',candidate.id,JSON.stringify(candidate)]);
  for(const candidate of briefing.scenario.excluded)rows.push(['excluded',candidate.id,JSON.stringify(candidate)]);
  for(const limitation of [...briefing.limitations,...briefing.scenario.assumptions])rows.push(['limitation','reason',limitation]);
  return rows.map(row=>row.map(safeBusCsvCell).join(',')).join('\r\n')+'\r\n';
}
