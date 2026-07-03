/**
 * @propolis
 * {
 *   "role": "PORT",
 *   "constraints": ["getLatest() must never trigger a live fetch to BNR — read-only against the persisted snapshot"],
 *   "agent_instructions": "Hexagonal port for the BNR benchmark rate, mirroring IProductRepository."
 * }
 */

export interface BenchmarkRate {
  source: string;
  metal: string;
  date: string;
  price: number;
  currency: string;
}

export interface IBenchmarkRepository {
  saveSnapshot(rate: BenchmarkRate): Promise<void>;
  getLatest(source: string): Promise<BenchmarkRate | null>;
}
