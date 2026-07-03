/**
 * @propolis
 * {
 *   "role": "ENTRY_POINT",
 *   "constraints": [
 *     "Composition Root — instantiates scrapers and repositories",
 *     "fetch handler is read-only against D1 — it must never trigger a live scrape",
 *     "scheduled handler is the only thing that writes to D1",
 *     "Non-/api/* requests never reach this file — Workers Static Assets serves them first (see wrangler.jsonc)"
 *   ],
 *   "agent_instructions": "This replaces the old Express server.ts. The scheduled handler runs every minute (see wrangler.jsonc crons) and is the sole writer to D1; the fetch handler only ever reads the last snapshot."
 * }
 */

import { Hono } from 'hono';
import { ProductAggregatorService } from './application/ProductAggregatorService';
import { TavexScraper } from './infrastructure/scrapers/TavexScraper';
import { AuromScraper } from './infrastructure/scrapers/AuromScraper';
import { AvangardScraper } from './infrastructure/scrapers/AvangardScraper';
import { NeogoldScraper } from './infrastructure/scrapers/NeogoldScraper';
import { BCRScraper } from './infrastructure/scrapers/BCRScraper';
import { D1ProductRepository } from './infrastructure/db/D1ProductRepository';
import { D1BenchmarkRepository } from './infrastructure/db/D1BenchmarkRepository';
import { fetchBnrGoldRate } from './infrastructure/benchmark/BnrBenchmarkClient';

async function runScrapeAndPersist(env: Env): Promise<void> {
  const aggregator = new ProductAggregatorService();
  aggregator.registerScraper(new TavexScraper());
  aggregator.registerScraper(new AuromScraper());
  aggregator.registerScraper(new AvangardScraper());
  aggregator.registerScraper(new NeogoldScraper());
  aggregator.registerScraper(new BCRScraper());

  const productRepo = new D1ProductRepository(env.DB);
  const benchmarkRepo = new D1BenchmarkRepository(env.DB);

  const [products, benchmark] = await Promise.all([
    aggregator.aggregateAll(),
    fetchBnrGoldRate(),
  ]);

  await productRepo.saveSnapshot(products);
  if (benchmark) {
    await benchmarkRepo.saveSnapshot(benchmark);
  }

  console.log(
    `Snapshot saved: ${products.length} products, benchmark ${benchmark ? `updated (${benchmark.price} RON)` : 'unavailable this tick'}`
  );
}

const app = new Hono<{ Bindings: Env }>();

app.get('/api/scrape/all', async c => {
  const repo = new D1ProductRepository(c.env.DB);
  const data = await repo.getAll();
  return c.json({ data });
});

app.get('/api/benchmark/gold', async c => {
  const repo = new D1BenchmarkRepository(c.env.DB);
  const rate = await repo.getLatest('BNR');
  if (!rate) {
    return c.json({ detail: 'Benchmark not yet available' }, 404);
  }
  return c.json(rate);
});

export default {
  fetch: app.fetch,
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Cron tick:', controller.cron, new Date(controller.scheduledTime).toISOString());
    ctx.waitUntil(runScrapeAndPersist(env));
  },
};
