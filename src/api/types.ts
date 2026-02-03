// API Types for FaceFair AI
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
}

export interface DemographicDistance {
  group: 'African' | 'Asian' | 'Caucasian' | 'Indian';
  averageDistance: number;
  sampleCount: number;
  isAboveThreshold: boolean;
}

export interface FairnessAuditResult {
  demographicDistances: DemographicDistance[];
  threshold: number;
  overallFairnessScore: number;
  timestamp: string;
  interpretation: {
    group: string;
    status: 'low_bias' | 'moderate_bias' | 'high_bias';
    message: string;
  }[];
}

export interface DemographicAffinityResult {
  distances: DemographicDistance[];
  predictedGroup: string;
  confidenceScore: number;
  disclaimer: string;
}

export interface FaceComparisonResult {
  face1Detected: boolean;
  face2Detected: boolean;
  cosineSimilarity: number;
  isMatch: boolean;
  confidence: number;
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
