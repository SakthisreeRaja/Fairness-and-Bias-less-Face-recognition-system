// Fairness Audit API
// Handles demographic fairness analysis

import { API_ENDPOINTS, API_TIMEOUT, getHeaders } from './config';
import type { ApiResponse, FairnessAuditResult } from './types';

export interface FairnessAuditOptions {
  threshold?: number;
  usePreprocessing?: boolean;
  maxPairs?: number;
  seed?: number;
}

/**
 * Run a fairness audit on the local reference dataset
 */
export async function runFairnessAudit(options?: FairnessAuditOptions): Promise<ApiResponse<FairnessAuditResult>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const payload = options ?? {};

    const response = await fetch(API_ENDPOINTS.fairnessAudit, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
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
