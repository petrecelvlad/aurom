/**
 * @propolis
 * {
 *   "role": "PORT",
 *   "constraints": [
 *     "Every dealer scraper and CachingScraperDecorator must implement this exact contract",
 *     "No custom return types — output must be StandardizedProduct[]"
 *   ],
 *   "agent_instructions": "This is the hexagonal port between ProductAggregatorService and dealer-specific scraper adapters. Do not add methods here without updating every adapter."
 * }
 */

import { StandardizedProduct } from './Product';

export interface IScraperStrategy {
  get providerName(): string;
  scrape(): Promise<StandardizedProduct[]>;
}
