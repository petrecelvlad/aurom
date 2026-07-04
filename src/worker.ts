/**
 * @propolis
 * {
 *   "role": "ENTRY_POINT",
 *   "constraints": [
 *     "Composition Root for persistence — instantiates repositories only, never scrapers",
 *     "GET routes are read-only against D1 — never trigger a live scrape",
 *     "POST /api/ingest is the only thing that writes to D1, and requires the INGEST_SECRET header",
 *     "Non-/api/* requests never reach this file — Workers Static Assets serves them first (see wrangler.jsonc)"
 *   ],
 *   "agent_instructions": "Scraping does not happen in this Worker at all (Free plan's 10ms CPU limit can't fit 5 scrapers + PDF parsing in one invocation). scripts/scrapeAndIngest.ts runs the actual scrapers from GitHub Actions on a schedule and POSTs the result here. Do not import scraper/cheerio/unpdf code into this file — that would defeat the point of moving the compute out."
 * }
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { ProductSchema } from './domain/Product';
import { D1ProductRepository } from './infrastructure/db/D1ProductRepository';
import { D1BenchmarkRepository } from './infrastructure/db/D1BenchmarkRepository';

const BenchmarkRateSchema = z.object({
  source: z.string(),
  metal: z.string(),
  date: z.string(),
  price: z.number(),
  currency: z.string(),
});

const IngestPayloadSchema = z.object({
  products: z.array(ProductSchema),
  benchmark: BenchmarkRateSchema.nullable().optional(),
});

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

app.post('/api/ingest', async c => {
  const secret = c.req.header('X-Ingest-Secret');
  if (!secret || secret !== c.env.INGEST_SECRET) {
    return c.json({ detail: 'Unauthorized' }, 401);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = IngestPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ detail: 'Invalid ingest payload', issues: parsed.error.issues }, 400);
  }

  const productRepo = new D1ProductRepository(c.env.DB);
  await productRepo.saveSnapshot(parsed.data.products);

  if (parsed.data.benchmark) {
    const benchmarkRepo = new D1BenchmarkRepository(c.env.DB);
    await benchmarkRepo.saveSnapshot(parsed.data.benchmark);
  }

  return c.json({ ok: true, productsIngested: parsed.data.products.length });
});

export default app;
