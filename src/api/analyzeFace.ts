// Face Analysis API
// Handles face detection and embedding generation

import { API_ENDPOINTS, API_TIMEOUT, getMultipartHeaders } from './config';
import type { ApiResponse, FaceAnalysisResult } from './types';

/**
 * Analyze a face image to detect faces and generate embeddings
 *
 * @param imageFile - The image file to analyze
 * @returns Promise with face analysis results including detection status and embedding info
 *
 * Integration Notes:
 * - This function sends the image to the Flask API
 * - The backend uses DeepFace with ArcFace model for embedding generation
 * - Expected response includes face detection status and embedding size
 */
export async function analyzeFace(imageFile: File): Promise<ApiResponse<FaceAnalysisResult>> {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(API_ENDPOINTS.analyzeFace, {
      method: 'POST',
      headers: getMultipartHeaders(),
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return { success: false, error: message };
  }
}
