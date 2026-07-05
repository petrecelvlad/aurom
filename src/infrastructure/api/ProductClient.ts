/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": ["Client-side HTTP adapter for the Worker's /api/scrape/all endpoint"],
 *   "agent_instructions": "Thin fetch wrapper consumed by useProducts. Reads a persisted D1 snapshot server-side — do not add client-side caching or retry logic here."
 * }
 */

import { StandardizedProduct } from '../../types';
import { API_BASE_URL } from './config';

interface ScrapeAllResponse {
  data?: StandardizedProduct[];
  detail?: string;
}

export class ProductClient {
  async fetchAllProducts(): Promise<StandardizedProduct[]> {
    const response = await fetch(`${API_BASE_URL}/api/scrape/all`);
    const result = (await response.json()) as ScrapeAllResponse;

    if (!response.ok) {
      throw new Error(result.detail || 'Failed to fetch data');
    }

    return result.data || [];
  }
}
