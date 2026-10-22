export type BusDirection = '0' | '1' | 'unknown';
export type BusEvidenceStatus = 'verified' | 'limited' | 'blocked' | 'unavailable' | 'unverified';
export interface BusSource { sourceId:string; url:string; status:BusEvidenceStatus; sha256:string|null; acquiredAt:string; sourceUpdatedAt:string|null; recordCount:number|null; limitations:string[] }
export interface BusRouteIndex { id:string; mainRouteId:string; nameZh:string; nameEn:string; operatorIds:string[]; operatorNames:string[]; variantCount:number; directionCount:number; stopOccurrenceCount:number; issueCount:number; detailFile:string }
export interface BusCandidate { id:string; routeId:string; mainRouteId:string; variantId:string; variantNameZh:string; variantNameEn:string; direction:BusDirection; operatorIds:string[]; stopCount:number; issues:string[]; sourceId?:string; geographicEligibility?:'network'|'unverified'|'out-of-scope'; evidenceStatus?:BusEvidenceStatus }
export interface BusStopOccurrence { occurrenceId:string; variantId:string; direction:BusDirection; sequence:number; stopId:string; stopLocationId:string|null; nameZh:string; nameEn:string; lat:number|null; lon:number|null }
export interface BusPublishedSchedule { kind:'headway'|'departure'; variantId:string; raw:Record<string,unknown> }
export interface BusRouteDetail { routeId:string; candidates:BusCandidate[]; stops:BusStopOccurrence[]; schedules:BusPublishedSchedule[]; shapes:{mainRouteId:string; variantId:string|null; direction:string; wkt:string; sourceUpdatedAt:string|null}[]; routeRaw:Record<string,unknown>[] }
export interface BusHistoryGates { officialAccessible:boolean; verifiedIdentity:boolean; actualEventSemantics:boolean; timezone:boolean; serviceDay:boolean; stableCrosswalk:boolean; comparableWindows:boolean; duplicateHandling:boolean; completeness:boolean; exceptions:boolean; outageHandling:boolean }
export interface BusSummary extends BusAuditCounts { schemaVersion:'1.0.0'; snapshotId:string; generatedAt:string; methodologyVersion:'bus-network-service-evidence-review-v1'; candidateCount:number; geometryMatchedCandidates:number; publishedServiceDirectionEligible:0; geographicScope:string; limitations:string[] }
export interface BusSnapshot { summary:BusSummary; routes:BusRouteIndex[]; candidates:BusCandidate[]; sources:BusSource[] }
export interface BusScenarioConfig { strategy:'evidence-gaps'|'balanced'; capacity:5|10|null; evidenceEdition?:string; includeAmbiguous?:boolean; routeId?:string; variantId?:string; direction?:BusDirection; objective?:'quality'|'published'|'historical' }
export interface BusEligibility { quality:boolean; published:boolean; historical:boolean; reasons:string[]; evidenceStatus:BusEvidenceStatus }
export interface BusReviewedCandidate extends BusCandidate { tier:'A'|'B'|'C'; eligibility:BusEligibility; reviewQuestion:string; unknownMeasurements:string[] }
export interface BusScenarioResult { config:BusScenarioConfig; population:number; eligible:BusReviewedCandidate[]; excluded:BusReviewedCandidate[]; selected:BusReviewedCandidate[]; capacityUsed:number; representedRoutes:number; representedVariants:number; geographicRepresentation:string; assumptions:string[] }
export interface BusAuditCounts {
  routeRecords:number; mainRouteIds:number; variantIds:number; operatorAssociations:number;
  stopPosts:number; physicalLocations:number; pathOccurrences:number; duplicateStopIds:number;
  missingMainRouteReferences:number; missingVariantReferences:number; missingStopReferences:number;
  missingLocationReferences:number; invalidStopCoordinates:number; headwayRecords:number;
  departureRecords:number; shapeRecords:number; specialScheduleEntries:number;
  historicalPerformanceEligible:false; historicalReasons:string[];
}
export interface BusManifest {
  schemaVersion:'1.0.0'; snapshotId:string; snapshotFile:string;
  summaryFile?:string; qualityReportFile?:string; sourceHealthFile?:string;
  files:Record<string,{sha256:string;bytes:number}>;
}
export interface HistoricalBusEvidence {
  sourceId:string; gates:BusHistoryGates; events:BusActualObservation[];
}
export interface BusActualObservation {
  id:string; candidateId:string; stopId:string; serviceDay:string; timestamp:string;
  semantics:'actual-arrival'|'actual-departure'|'estimate'|'position';
}
