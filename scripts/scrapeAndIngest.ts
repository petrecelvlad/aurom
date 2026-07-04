/**
 * @propolis
 * {
 *   "role": "ENTRY_POINT",
 *   "constraints": [
 *     "Runs under Node (via tsx), not in the Worker — this is where the actual scraping CPU cost lives",
 *     "Requires WORKER_URL and INGEST_SECRET environment variables"
 *   ],
 *   "agent_instructions": "Invoked by .github/workflows/scrape.yml on a schedule. Reuses ProductAggregatorService and the 5 scrapers unchanged — the only thing this file adds is the HTTP POST to the Worker's /api/ingest route."
 * }
 */

import { ProductAggregatorService } from '../src/application/ProductAggregatorService';
import { TavexScraper } from '../src/infrastructure/scrapers/TavexScraper';
import { AuromScraper } from '../src/infrastructure/scrapers/AuromScraper';
import { AvangardScraper } from '../src/infrastructure/scrapers/AvangardScraper';
import { NeogoldScraper } from '../src/infrastructure/scrapers/NeogoldScraper';
import { BCRScraper } from '../src/infrastructure/scrapers/BCRScraper';
import { fetchBnrGoldRate } from '../src/infrastructure/benchmark/BnrBenchmarkClient';

async function main(): Promise<void> {
  const workerUrl = process.env.WORKER_URL;
  const ingestSecret = process.env.INGEST_SECRET;
  if (!workerUrl || !ingestSecret) {
    throw new Error('WORKER_URL and INGEST_SECRET environment variables are required');
  }

  const aggregator = new ProductAggregatorService();
  aggregator.registerScraper(new TavexScraper());
  aggregator.registerScraper(new AuromScraper());
  aggregator.registerScraper(new AvangardScraper());
  aggregator.registerScraper(new NeogoldScraper());
  aggregator.registerScraper(new BCRScraper());

  const [products, benchmark] = await Promise.all([aggregator.aggregateAll(), fetchBnrGoldRate()]);

  console.log(`Scraped ${products.length} products, benchmark ${benchmark ? `${benchmark.price} RON` : 'unavailable'}`);

  const response = await fetch(`${workerUrl.replace(/\/$/, '')}/api/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Ingest-Secret': ingestSecret,
    },
    body: JSON.stringify({ products, benchmark }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ingest failed: HTTP ${response.status} ${text}`);
  }

  const result = await response.json();
  console.log('Ingest succeeded:', result);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
