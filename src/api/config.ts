// API Configuration for FairFace Insight
// Point to the local Flask API or your deployed backend

// Base URL for API
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// API Endpoints
export const API_ENDPOINTS = {
  analyzeFace: `${API_BASE_URL}/analyze-face`,
  fairnessAudit: `${API_BASE_URL}/fairness-audit`,
  predictDemographic: `${API_BASE_URL}/predict-demographic`,
  compareFaces: `${API_BASE_URL}/compare-faces`,
} as const;

// Request timeout in milliseconds
export const API_TIMEOUT = 30000;

// Helper function to create headers
export const getHeaders = (): HeadersInit => {
  return {
    'Content-Type': 'application/json',
    // Add Authorization header when Firebase Auth is implemented
    // 'Authorization': `Bearer ${getAuthToken()}`
  };
};

// Helper to handle file uploads
export const getMultipartHeaders = (): HeadersInit => {
  return {
    // Don't set Content-Type for multipart - browser will set it with boundary
    // Add Authorization header when Firebase Auth is implemented
    // 'Authorization': `Bearer ${getAuthToken()}`
  };
};
