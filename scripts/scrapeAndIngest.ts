/**
 * @propolis
 * {
 *   "role": "ENTRY_POINT",
 *   "constraints": [
 *     "Runs under Node (via tsx), not in the Worker — this is where the actual scraping CPU cost lives",
 *     "Requires WORKER_URL and INGEST_SECRET environment variables"
 *   ],
 *   "agent_instructions": "Invoked by .github/workflows/scrape.yml on a schedule. Reuses ProductAggregatorService and all 5 RON-native scrapers unchanged. Münze Österreich is scraped separately (not through ProductAggregatorService, since it's EUR-priced and doesn't implement IScraperStrategy) and converted to RON here using the same BNR EUR rate fetched for the benchmark row, before being merged into the ingest payload. If the EUR rate is unavailable this tick, Muenze products are skipped entirely rather than ingested with a wrong or stale rate — D1's upsert-by-(provider,sku) means last tick's Muenze snapshot simply stays visible until the next successful tick. AvangardScraper was previously paused over an explicit ToS conflict (no outreach was ever sent — see PROVIDER_SCRAPING_SPECS.md); the user made an informed decision to re-enable it without asking first."
 * }
 */

import { ProductAggregatorService } from '../src/application/ProductAggregatorService';
import { TavexScraper } from '../src/infrastructure/scrapers/TavexScraper';
import { AuromScraper } from '../src/infrastructure/scrapers/AuromScraper';
import { AvangardScraper } from '../src/infrastructure/scrapers/AvangardScraper';
import { NeogoldScraper } from '../src/infrastructure/scrapers/NeogoldScraper';
import { BCRScraper } from '../src/infrastructure/scrapers/BCRScraper';
import { MuenzeOesterreichScraper, convertMuenzeProductsToRon } from '../src/infrastructure/scrapers/MuenzeOesterreichScraper';
import { fetchBnrRates } from '../src/infrastructure/benchmark/BnrBenchmarkClient';

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

  const [products, bnrRates, muenzeProducts] = await Promise.all([
    aggregator.aggregateAll(),
    fetchBnrRates(),
    new MuenzeOesterreichScraper().scrape(),
  ]);
  const benchmarks = [bnrRates.gold, bnrRates.eur].filter(rate => rate !== null);

  let allProducts = products;
  if (bnrRates.eur) {
    const muenzeInRon = convertMuenzeProductsToRon(muenzeProducts, bnrRates.eur.price);
    allProducts = [...products, ...muenzeInRon];
    console.log(`Converted ${muenzeInRon.length} Muenze Österreich products to RON at ${bnrRates.eur.price} RON/EUR`);
  } else {
    console.error(`EUR/RON rate unavailable — skipping ${muenzeProducts.length} Muenze Österreich products this run`);
  }

  console.log(`Scraped ${allProducts.length} products, benchmarks: ${benchmarks.map(r => `${r.source}=${r.price}`).join(', ') || 'unavailable'}`);

  const response = await fetch(`${workerUrl.replace(/\/$/, '')}/api/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Ingest-Secret': ingestSecret,
    },
    body: JSON.stringify({ products: allProducts, benchmarks }),
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
