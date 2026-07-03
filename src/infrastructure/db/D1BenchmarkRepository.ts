/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": [
 *     "Implements the IBenchmarkRepository port against Cloudflare D1",
 *     "benchmark is upserted every tick; benchmark_history only gets a row when BNR's published rate actually changed"
 *   ],
 *   "agent_instructions": "Called once per cron tick (saveSnapshot) and once per API request (getLatest). getLatest must stay a pure read — no live BNR fetch."
 * }
 */

import { BenchmarkRate, IBenchmarkRepository } from '../../domain/IBenchmarkRepository';

export class D1BenchmarkRepository implements IBenchmarkRepository {
  constructor(private readonly db: D1Database) {}

  async saveSnapshot(rate: BenchmarkRate): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.db
      .prepare('SELECT date, price FROM benchmark WHERE source = ?')
      .bind(rate.source)
      .first<{ date: string; price: number }>();

    await this.db
      .prepare(
        `INSERT INTO benchmark (source, metal, date, price, currency, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(source) DO UPDATE SET
           metal = excluded.metal,
           date = excluded.date,
           price = excluded.price,
           currency = excluded.currency,
           updated_at = excluded.updated_at`
      )
      .bind(rate.source, rate.metal, rate.date, rate.price, rate.currency, now)
      .run();

    const changed = !existing || existing.price !== rate.price || existing.date !== rate.date;
    if (changed) {
      await this.db
        .prepare(
          `INSERT INTO benchmark_history (source, metal, date, price, currency, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(rate.source, rate.metal, rate.date, rate.price, rate.currency, now)
        .run();
    }
  }

  async getLatest(source: string): Promise<BenchmarkRate | null> {
    const row = await this.db
      .prepare('SELECT source, metal, date, price, currency FROM benchmark WHERE source = ?')
      .bind(source)
      .first<BenchmarkRate>();
    return row ?? null;
  }
}
