// API Types for FairFace Insight
// These types define the structure for all API requests and responses

export interface FaceAnalysisResult {
  faceDetected: boolean;
  embeddingSize: number;
  modelUsed: string;
  processingTime: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence?: number;
  detectorBackend?: string;
  illumination?: {
    meanLuminance?: number | null;
    bucket?: string;
  };
  preprocessing?: {
    applied: boolean;
    method?: string;
    gamma?: number;
    variant?: string;
  };
}

export interface DemographicDistance {
  group: string;
  averageDistance: number;
  sampleCount: number;
  isAboveThreshold: boolean;
  threshold?: number;
}

export interface DistanceHistogram {
  bins: number[];
  counts: number[];
}

export interface DistanceStats {
  count: number;
  mean?: number | null;
  std?: number | null;
  min?: number | null;
  max?: number | null;
  p10?: number | null;
  p50?: number | null;
  p90?: number | null;
  histogram: DistanceHistogram;
}

export interface ErrorMetrics {
  threshold: number;
  fpr?: number | null;
  fnr?: number | null;
  tpr?: number | null;
  tnr?: number | null;
  accuracy?: number | null;
  balancedAccuracy?: number | null;
}

export interface LookAlikeRisk {
  threshold?: number | null;
  rate?: number | null;
  overlap?: number | null;
  dPrime?: number | null;
}

export interface IlluminationBucket {
  count: number;
  detectionRate?: number | null;
}

export interface IlluminationStats {
  meanLuminance?: number | null;
  buckets: {
    low?: IlluminationBucket;
    normal?: IlluminationBucket;
    high?: IlluminationBucket;
    unknown?: IlluminationBucket;
  };
}

export interface GroupAuditResult {
  group: string;
  sampleCount: number;
  identityCount: number;
  centroidDistance?: number | null;
  detectionRate?: number | null;
  illumination: IlluminationStats;
  preprocessingUsageRate?: number | null;
  genuine: DistanceStats;
  impostor: DistanceStats;
  metrics: ErrorMetrics;
  mitigation: ErrorMetrics & {
    calibratedSimilarity?: {
      genuineMean?: number | null;
      impostorMean?: number | null;
      method?: string;
    } | null;
  };
  lookAlikeRisk?: LookAlikeRisk;
  warnings?: string[];
  interpretation?: {
    status: string;
    message: string;
  };
}

export interface GapSummary {
  min: number;
  max: number;
  gap: number;
  mean: number;
}

export interface FairnessAuditResult {
  groups: GroupAuditResult[];
  demographicDistances: DemographicDistance[];
  thresholds: {
    standard: number;
    adaptiveStrategy: string;
    targetFpr?: number;
  };
  overall: {
    baselineScore: number;
    mitigatedScore: number;
    baselineFprGap?: GapSummary | null;
    baselineFnrGap?: GapSummary | null;
    baselineBalancedAccuracy?: GapSummary | null;
    mitigatedFprGap?: GapSummary | null;
    mitigatedFnrGap?: GapSummary | null;
    mitigatedBalancedAccuracy?: GapSummary | null;
  };
  overallFairnessScore?: number;
  notes?: string[];
  groupDefinitions?: Record<string, string>;
  config?: {
    model: string;
    detectorBackend: string;
    minFaceConfidence: number;
    preprocessingEnabled: boolean;
    preprocessMethod: string;
  };
  evaluationPlan?: {
    metrics: string[];
    baselines: string[];
    dataset: string;
  };
  timestamp: string;
  processingTime?: number;
}

export interface ReferenceDecision {
  threshold: number;
  withinThreshold: boolean;
  thresholdSource: string;
  note?: string;
}

export interface DemographicAffinityResult {
  distances: DemographicDistance[];
  predictedGroup: string;
  confidenceScore: number;
  disclaimer: string;
  referenceDecision?: ReferenceDecision;
  preprocessing?: {
    applied: boolean;
    method?: string;
    gamma?: number;
    variant?: string;
  };
  processingTime?: number;
}

export interface FaceComparisonResult {
  face1Detected: boolean;
  face2Detected: boolean;
  cosineSimilarity: number;
  distance?: number;
  isMatch: boolean;
  confidence: number;
  calibratedSimilarity?: number;
  threshold?: number;
  thresholdSource?: string;
  twinLookAlikeRisk?: {
    flag: boolean;
    threshold: number;
    note: string;
  };
  warnings?: string[];
  processingTime: number;
}

export interface HistoryEntry {
  id: string;
  type: 'analysis' | 'audit' | 'affinity' | 'comparison';
  timestamp: string;
  thumbnailUrl?: string;
  summary: string;
  result: FaceAnalysisResult | FairnessAuditResult | DemographicAffinityResult | FaceComparisonResult;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
