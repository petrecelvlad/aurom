/**
 * @propolis
 * {
 *   "role": "MIDDLEWARE",
 *   "constraints": [
 *     "Wraps an existing IScraperStrategy strategy",
 *     "Time-based in-memory caching to avoid scraping rate limits"
 *   ],
 *   "agent_instructions": "This decorator intercept scraper calls to return cached results if they are within the cacheDurationMinutes window. Used to prevent rate-limiting on dealer platforms."
 * }
 */

import { IScraperStrategy } from '../../domain/IScraperStrategy';
import { StandardizedProduct } from '../../domain/Product';

export class CachingScraperDecorator implements IScraperStrategy {
  private cache: StandardizedProduct[] | null = null;
  private lastFetchTime: number = 0;
  private readonly cacheDurationMs: number;

  constructor(
    private readonly innerScraper: IScraperStrategy,
    cacheDurationMinutes: number = 5
  ) {
    this.cacheDurationMs = cacheDurationMinutes * 60 * 1000;
  }

  get providerName(): string {
    return this.innerScraper.providerName;
  }

  async scrape(): Promise<StandardizedProduct[]> {
    const now = Date.now();
    
    if (this.cache && (now - this.lastFetchTime < this.cacheDurationMs)) {
      console.log(`[Cache Hit] Returning cached data for ${this.providerName}`);
      return this.cache;
    }

    console.log(`[Cache Miss] Fetching fresh data for ${this.providerName}`);
    const data = await this.innerScraper.scrape();
    
    this.cache = data;
    this.lastFetchTime = now;
    
    return data;
  }
}
