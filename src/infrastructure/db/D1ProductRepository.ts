/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": [
 *     "Implements the IProductRepository port against Cloudflare D1",
 *     "products table is upserted every tick; price_history only gets a row when a price actually changed",
 *     "Batches are chunked to stay comfortably under D1's per-batch statement limit"
 *   ],
 *   "agent_instructions": "Called once per cron tick (saveSnapshot) and once per API request (getAll). getAll must stay a pure read — no scraping, no side effects."
 * }
 */

import { StandardizedProduct, ProductSchema } from '../../domain/Product';
import { IProductRepository } from '../../domain/IProductRepository';

const BATCH_SIZE = 100;

export class D1ProductRepository implements IProductRepository {
  constructor(private readonly db: D1Database) {}

  async saveSnapshot(products: StandardizedProduct[]): Promise<void> {
    if (products.length === 0) return;

    const existing = await this.db
      .prepare('SELECT provider, sku, sell_price_ron, buy_price_ron FROM products')
      .all<{ provider: string; sku: string; sell_price_ron: number | null; buy_price_ron: number | null }>();

    const previous = new Map<string, { sell: number | null; buy: number | null }>();
    for (const row of existing.results) {
      previous.set(`${row.provider}::${row.sku}`, { sell: row.sell_price_ron, buy: row.buy_price_ron });
    }

    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];

    for (const p of products) {
      statements.push(
        this.db
          .prepare(
            `INSERT INTO products (provider, sku, name, url, weight_g, stock_status, buy_price_ron, sell_price_ron, sell_price_per_g_ron, buy_price_per_g_ron, metal, purity, karats, fine_weight_g, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(provider, sku) DO UPDATE SET
               name = excluded.name,
               url = excluded.url,
               weight_g = excluded.weight_g,
               stock_status = excluded.stock_status,
               buy_price_ron = excluded.buy_price_ron,
               sell_price_ron = excluded.sell_price_ron,
               sell_price_per_g_ron = excluded.sell_price_per_g_ron,
               buy_price_per_g_ron = excluded.buy_price_per_g_ron,
               metal = excluded.metal,
               purity = excluded.purity,
               karats = excluded.karats,
               fine_weight_g = excluded.fine_weight_g,
               updated_at = excluded.updated_at`
          )
          .bind(
            p.provider,
            p.sku,
            p.name,
            p.url,
            p.weight_g,
            p.stock_status,
            p.buy_price_ron,
            p.sell_price_ron,
            p.sell_price_per_g_ron,
            p.buy_price_per_g_ron,
            p.metal,
            p.purity ?? null,
            p.karats ?? null,
            p.fine_weight_g ?? null,
            now
          )
      );

      const prev = previous.get(`${p.provider}::${p.sku}`);
      const priceChanged = !prev || prev.sell !== p.sell_price_ron || prev.buy !== p.buy_price_ron;
      if (priceChanged) {
        statements.push(
          this.db
            .prepare(
              `INSERT INTO price_history (provider, sku, sell_price_ron, buy_price_ron, sell_price_per_g_ron, buy_price_per_g_ron, recorded_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(p.provider, p.sku, p.sell_price_ron, p.buy_price_ron, p.sell_price_per_g_ron, p.buy_price_per_g_ron, now)
        );
      }
    }

    for (let i = 0; i < statements.length; i += BATCH_SIZE) {
      await this.db.batch(statements.slice(i, i + BATCH_SIZE));
    }
  }

  async getAll(): Promise<StandardizedProduct[]> {
    const { results } = await this.db.prepare('SELECT * FROM products ORDER BY provider, sku').all();
    return results.map(row => ProductSchema.parse(row));
  }
}
