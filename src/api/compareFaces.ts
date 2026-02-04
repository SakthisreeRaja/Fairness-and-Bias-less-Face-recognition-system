// Face Comparison API
// Compares two faces for similarity

import { API_ENDPOINTS, API_TIMEOUT, getMultipartHeaders } from './config';
import type { ApiResponse, FaceComparisonResult } from './types';

export interface CompareOptions {
  group?: string;
  useAdaptiveThreshold?: boolean;
}

/**
 * Compare two face images for similarity
 *
 * @param image1 - First face image
 * @param image2 - Second face image
 * @param options - Optional thresholding options
 * @returns Promise with comparison results including similarity score and match verdict
 */
export async function compareFaces(
  image1: File,
  image2: File,
  options?: CompareOptions
): Promise<ApiResponse<FaceComparisonResult>> {
  try {
    const formData = new FormData();
    formData.append('image1', image1);
    formData.append('image2', image2);

    if (options?.group) {
      formData.append('group', options.group);
    }
    if (options?.useAdaptiveThreshold) {
      formData.append('useAdaptiveThreshold', 'true');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(API_ENDPOINTS.compareFaces, {
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
