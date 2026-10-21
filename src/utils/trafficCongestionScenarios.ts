import type { CongestionReviewCandidate, TrafficCongestionSnapshot, TrafficEvidenceScope, TrafficScenarioConfig, TrafficScenarioResult } from '../types/trafficCongestion';

const stable = (a:string,b:string) => a < b ? -1 : a > b ? 1 : 0;
const performanceOrder = (a:CongestionReviewCandidate,b:CongestionReviewCandidate) =>
  ({A:0,B:1,C:2,insufficient:3}[a.reviewTier]-{A:0,B:1,C:2,insufficient:3}[b.reviewTier]) ||
  (b.observedPerformanceEvidence.slowdownFrequency ?? -Infinity)-(a.observedPerformanceEvidence.slowdownFrequency ?? -Infinity) ||
  (b.observedPerformanceEvidence.relativeSlowdown ?? -Infinity)-(a.observedPerformanceEvidence.relativeSlowdown ?? -Infinity) ||
  (b.dataQualityEvidence.completenessRatio??-1)-(a.dataQualityEvidence.completenessRatio??-1) ||
  stable(a.validatedSegmentIdentity ?? a.deviceId,b.validatedSegmentIdentity ?? b.deviceId) || stable(a.direction??'',b.direction??'') ||
  stable(a.corridorId,b.corridorId) || stable(a.stableCandidateId,b.stableCandidateId);
const qualityOrder = (a:CongestionReviewCandidate,b:CongestionReviewCandidate) =>
  ({urgent:0,review:1,ready:2}[a.qualityTier]-{urgent:0,review:1,ready:2}[b.qualityTier]) ||
  b.dataQualityEvidence.flags.length-a.dataQualityEvidence.flags.length ||
  (b.dataQualityEvidence.invalidSampleRatio??-1)-(a.dataQualityEvidence.invalidSampleRatio??-1) ||
  (a.dataQualityEvidence.completenessRatio??-1)-(b.dataQualityEvidence.completenessRatio??-1) || stable(a.corridorId,b.corridorId) || stable(a.stableCandidateId,b.stableCandidateId);
export function runTrafficScenario(candidates:CongestionReviewCandidate[],config:TrafficScenarioConfig):TrafficScenarioResult {
  if (config.capacity!==null && (!Number.isSafeInteger(config.capacity)||config.capacity<=0)) throw new Error('Capacity must be a positive integer or null');
  const population=candidates.filter(c=>(!config.corridorId||c.corridorId===config.corridorId)&&(!config.direction||c.direction===config.direction)&&(!config.timeWindow||c.timeWindow===config.timeWindow));
  const qualify=(c:CongestionReviewCandidate)=>config.strategy==='quality'?c.qualityTier!=='ready':c.eligible && c.reviewTier!=='insufficient';
  const eligible=population.filter(qualify).sort(config.strategy==='quality'?qualityOrder:performanceOrder);
  const excluded=population.filter(c=>!qualify(c)).sort((a,b)=>stable(a.stableCandidateId,b.stableCandidateId));
  const capacity=config.capacity??eligible.length;
  let selected:CongestionReviewCandidate[]=[];
  if (config.strategy==='balanced') {
    const corridors=[...new Set(eligible.map(c=>c.corridorId))].sort(stable);
    // Round-robin one ranked candidate per corridor per round; no random tie-breaking.
    for(let round=0;selected.length<capacity;round++) {
      let added=false;
      for(const corridor of corridors) { const next=eligible.filter(c=>c.corridorId===corridor)[round]; if(next&&selected.length<capacity){selected.push(next);added=true;} }
      if(!added)break;
    }
  } else selected=eligible.slice(0,capacity);
  if(config.eligibility==='excluded')selected=[];
  return {config:{...config},selected,eligible,excluded,representedCorridors:new Set(selected.map(c=>c.corridorId)).size,
    objective:config.strategy==='quality'?'quality':'performance',limitations:config.strategy==='quality'
      ?['Observation-quality priorities are independent from traffic performance.']
      :['Review slots are investigations; no improvement or travel-time saving is estimated.',...(eligible.length?[]:['No comparable performance evidence qualifies.'])]};
}
const scopeKey=(scope:TrafficEvidenceScope)=>JSON.stringify({sourceVersions:[...new Set(scope.sourceVersions)].sort(stable),acceptedDays:[...new Set(scope.acceptedDays)].sort(stable),deviceIds:[...new Set(scope.deviceIds)].sort(stable),directionLinkIdentities:[...new Set(scope.directionLinkIdentities)].sort(stable),timeWindow:scope.timeWindow,population:scope.population,minimumCompleteness:scope.minimumCompleteness,baselineDefinition:scope.baselineDefinition,slowdownThreshold:scope.slowdownThreshold});
export function compareTrafficScenarios(first:TrafficScenarioResult,second:TrafficScenarioResult,firstScope:TrafficEvidenceScope,secondScope:TrafficEvidenceScope) {
  const sameEvidenceScope=scopeKey(firstScope)===scopeKey(secondScope);
  const sameObjective=first.objective===second.objective;
  const firstIds=new Set(first.selected.map(c=>c.stableCandidateId));const secondIds=new Set(second.selected.map(c=>c.stableCandidateId));
  const addedIds=[...secondIds].filter(id=>!firstIds.has(id)).sort(stable);const removedIds=[...firstIds].filter(id=>!secondIds.has(id)).sort(stable);
  return {sameEvidenceScope,sameObjective,identicalSelection:!addedIds.length&&!removedIds.length,addedIds,removedIds,
    warnings:[...(!sameEvidenceScope?['Different evidence scope; changes are not a fair strategy comparison.']:[]),...(!sameObjective?['Different objectives: quality and performance cannot be compared as congestion outcomes.']:[])]};
}
export function buildTrafficBriefing(snapshot:TrafficCongestionSnapshot,result:TrafficScenarioResult,scope:TrafficEvidenceScope,comparison?:ReturnType<typeof compareTrafficScenarios>) {
  return {title:'Neihu Corridor Review Briefing / 內湖道路壅塞與交通資料查核建議摘要',
    policyQuestion:'Which verified Neihu corridor directions and time windows warrant transportation-engineering investigation?',
    geographicScope:'Neihu Technology Park and verified connecting corridors; detector coverage is not complete-road coverage.',
    snapshotId:snapshot.snapshotId,generatedAt:snapshot.generatedAt,methodologyVersion:snapshot.methodologyVersion,configurationVersion:snapshot.configurationVersion,
    mode:snapshot.mode,sources:snapshot.sources,sourceSha256:snapshot.sourceSha256,
    observationPeriod:{from:snapshot.observedFrom,through:snapshot.observedThrough},
    coverage:{devices:snapshot.detectorCoverage,corridors:snapshot.corridorCoverage,directions:snapshot.directionCoverage},
    evidenceScope:scope,comparatorAssumptions:snapshot.comparatorAssumptions,
    performanceIndicatorsAvailable:snapshot.scenarioEligibility.performance,
    methodology:'A: ≥5 comparable weekdays, ≥3 repeated slowdown days and median slowdown ≥ configured threshold. B: ≥2 repeated days. C: comparable observations without A/B. Insufficient: fewer than 2 comparable days or failed coverage. Quality reviewed separately.',
    scenario:result,comparison:comparison??null,sourceGaps:snapshot.scenarioEligibility.reasons,
    policyContext:['https://tuic.gov.taipei/neihu_traffic/'],
    engineeringQuestions:['Confirm detector lane/direction/link identities and observation definitions.','Acquire and validate comparable historical periods and a public-holiday calendar.','Investigate causes before recommending an intervention.'],
    limitations:[...snapshot.limitations,...result.limitations,'Accident counts do not enter traffic-performance or quality ranking.']};
}
export type TrafficBriefing=ReturnType<typeof buildTrafficBriefing>;
export function exportTrafficBriefingJson(briefing:TrafficBriefing):string { return JSON.stringify(briefing,null,2); }
export function safeTrafficCsvCell(value:unknown):string {
  let text=value===null||value===undefined?'':String(value);
  if(/^[\s\u0000-\u001f]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text=`'${text}`;
  return `"${text.replace(/"/g,'""')}"`;
}
export function exportTrafficBriefingCsv(briefing:TrafficBriefing):string {
  const rows:unknown[][]=[['section','key','value'],['briefing','snapshotId',briefing.snapshotId],['briefing','title',briefing.title],
    ['briefing','policyQuestion',briefing.policyQuestion],['briefing','geographicScope',briefing.geographicScope],
    ['briefing','methodology',briefing.methodology],['briefing','mode',briefing.mode],
    ['briefing','evidenceScope',JSON.stringify(briefing.evidenceScope)],['briefing','observationPeriod',JSON.stringify(briefing.observationPeriod)],
    ['briefing','coverage',JSON.stringify(briefing.coverage)],['briefing','strategy',briefing.scenario.config.strategy],['briefing','capacity',briefing.scenario.config.capacity??'unlimited'],
    ['briefing','performanceIndicatorsAvailable',briefing.performanceIndicatorsAvailable],['briefing','comparison',JSON.stringify(briefing.comparison)]];
  for(const source of briefing.sources)rows.push(['source',source.sourceId,JSON.stringify(source)]);
  for(const [source,hash]of Object.entries(briefing.sourceSha256).sort(([a],[b])=>stable(a,b)))rows.push(['sha256',source,hash]);
  for(const candidate of briefing.scenario.selected)rows.push(['selected',candidate.stableCandidateId,JSON.stringify(candidate)]);
  for(const candidate of briefing.scenario.excluded)rows.push(['excluded',candidate.stableCandidateId,JSON.stringify(candidate)]);
  for(const value of briefing.sourceGaps)rows.push(['sourceGap','reason',value]);
  for(const value of briefing.engineeringQuestions)rows.push(['engineeringQuestion','question',value]);
  for(const value of briefing.policyContext)rows.push(['policyContext','url',value]);
  for(const value of briefing.limitations)rows.push(['limitation','reason',value]);
  return rows.map(row=>row.map(safeTrafficCsvCell).join(',')).join('\r\n')+'\r\n';
}
