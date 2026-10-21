export type TrafficWindow = 'morning' | 'evening' | 'offPeak';
export type TrafficPopulation = 'weekday' | 'weekend' | 'all';
export type PerformanceTier = 'A' | 'B' | 'C' | 'insufficient';
export type QualityTier = 'urgent' | 'review' | 'ready';
export type TrafficStrategy = 'slowdown' | 'balanced' | 'quality';
export interface TrafficSource {
  sourceId: string; resourceId: string; title: string; url: string;
  status: 'verified_analysis' | 'limited' | 'context_only' | 'unavailable' | 'excluded';
  retrievedAt: string; sha256: string | null; resourceVersion: string;
  observedFrom: string | null; observedThrough: string | null;
  limitations: string[];
}
export interface TrafficDevice {
  deviceId: string; sourceId: string; roadName: string; corridorId: string;
  verifiedLinkId: string | null; direction: string | null; roadClass: string | null;
  location: { latitude: number; longitude: number } | null;
  detectorType: string | null; laneCount: number | null; metadataVersion: string;
  geographicScope: 'neihu' | 'connecting' | 'out_of_scope' | 'unverified'; sourceQualityFlags: string[];
}
export interface TrafficCorridor { corridorId: string; nameZh: string; nameEn: string; deviceIds: string[]; limitations: string[] }
export interface TrafficObservation {
  sourceId: string; resourceVersion: string; metadataVersion: string; deviceId: string;
  linkId: string | null; direction: string | null; observedAt: string; intervalSeconds: number;
  speedKmh: number | null; flowCount: number | null; occupancy: number | null;
  laneIdentity: string; laneClass: string; validationStatus: 'valid' | 'invalid';
}
export interface TrafficTimeWindowAggregate {
  deviceId: string; linkId: string | null; direction: string | null; date: string;
  timeWindow: TrafficWindow; sourceId: string; resourceVersion: string; metadataVersion: string;
  laneIdentity: string; laneClass: string; expectedSamples: number; receivedSamples: number;
  validSamples: number; missingSamples: number; duplicateSamples: number; invalidSamples: number;
  completenessRatio: number; medianSpeedKmh: number | null; referenceMedianSpeedKmh: number | null;
  observedRelativeSlowdown: number | null; eligibleForComparison: boolean; exclusionReasons: string[];
}
export interface CongestionReviewCandidate {
  stableCandidateId: string; corridorId: string; roadCorridor: string; deviceId: string;
  validatedSegmentIdentity: string | null; direction: string | null; timeWindow: TrafficWindow;
  eligible: boolean; reviewTier: PerformanceTier; qualityTier: QualityTier;
  observedPerformanceEvidence: { medianSpeedKmh: number | null; relativeSlowdown: number | null;
    eligibleDays: number; repeatedSlowdownDays: number; slowdownFrequency: number | null };
  dataQualityEvidence: { completenessRatio: number | null; invalidSampleRatio: number | null; flags: string[] };
  explanation: string[]; limitations: string[];
}
export interface TrafficEvidenceScope {
  sourceVersions: string[]; acceptedDays: string[]; deviceIds: string[]; directionLinkIdentities: string[];
  timeWindow: TrafficWindow; population: TrafficPopulation; minimumCompleteness: number;
  baselineDefinition: string; slowdownThreshold: number;
}
export interface TrafficScenarioConfig { strategy: TrafficStrategy; capacity: number | null; corridorId?: string;
  direction?: string; timeWindow?: TrafficWindow; eligibility?: 'all' | 'eligible' | 'excluded' }
export interface TrafficScenarioResult { config: TrafficScenarioConfig; selected: CongestionReviewCandidate[];
  eligible: CongestionReviewCandidate[]; excluded: CongestionReviewCandidate[]; representedCorridors: number;
  objective: 'performance' | 'quality'; limitations: string[] }
export interface TrafficCongestionSnapshot {
  schemaVersion: '1.0.0'; methodologyVersion: 'neihu-traffic-observation-review-v1'; configurationVersion: '1.0.0';
  snapshotId: string; generatedAt: string; mode: 'readiness' | 'snapshot' | 'historical';
  sourceResourceIds: string[]; sourceSha256: Record<string, string>; observedFrom: string | null;
  observedThrough: string | null; expectedSamplingInterval: number | null; validSampleCount: number;
  excludedSampleCount: number; detectorCoverage: number; corridorCoverage: number; directionCoverage: number;
  observationQuality: string[]; comparatorAssumptions: string[];
  scenarioEligibility: { performance: boolean; quality: boolean; reasons: string[] };
  limitations: string[]; sources: TrafficSource[]; devices: TrafficDevice[]; corridors: TrafficCorridor[];
  observations: TrafficObservation[]; dailyAggregates: TrafficTimeWindowAggregate[]; candidates: CongestionReviewCandidate[];
}
