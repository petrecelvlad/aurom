/**
 * @propolis
 * {
 *   "role": "PORT",
 *   "constraints": [
 *     "getAll() must never trigger a live scrape — it only ever reads the last persisted snapshot"
 *   ],
 *   "agent_instructions": "This is the hexagonal port between the fetch handler (reads) and the scheduled handler (writes) and D1. Do not add scraping logic to any implementation of this port."
 * }
 */

import { StandardizedProduct } from './Product';

export interface IProductRepository {
  saveSnapshot(products: StandardizedProduct[]): Promise<void>;
  getAll(): Promise<StandardizedProduct[]>;
}
