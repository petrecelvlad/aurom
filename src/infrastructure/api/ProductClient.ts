/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": ["Client-side HTTP adapter for the Express /api/scrape/all endpoint"],
 *   "agent_instructions": "Thin fetch wrapper consumed by useProducts. Do not add caching or retry logic here — that lives server-side in CachingScraperDecorator."
 * }
 */

import { StandardizedProduct } from '../../types';

export class ProductClient {
  async fetchAllProducts(): Promise<StandardizedProduct[]> {
    const response = await fetch('/api/scrape/all');
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.detail || 'Failed to fetch data');
    }

    return result.data || [];
  }
}
