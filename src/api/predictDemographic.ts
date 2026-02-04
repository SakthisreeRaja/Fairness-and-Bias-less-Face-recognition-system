// Demographic Affinity API
// Reports similarity trends from face embeddings

import { API_ENDPOINTS, API_TIMEOUT, getMultipartHeaders } from './config';
import type { ApiResponse, DemographicAffinityResult } from './types';

/**
 * Calculate demographic affinity based on face embedding similarities
 *
 * @param imageFile - The image file to analyze
 * @returns Promise with demographic affinity results
 *
 * IMPORTANT DISCLAIMER:
 * This system does NOT classify race. It reports similarity trends from face embeddings
 * by comparing the input face's embedding against reference embeddings from different
 * demographic groups. The "predicted group" indicates which reference set the face
 * embedding is most similar to, NOT a racial classification.
 */
export async function predictDemographic(imageFile: File): Promise<ApiResponse<DemographicAffinityResult>> {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(API_ENDPOINTS.predictDemographic, {
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
