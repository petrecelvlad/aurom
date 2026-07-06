/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": [
 *     "Implements the IScraperStrategy port",
 *     "Dependencies: fetchWithTimeout, politeDelay (no cheerio — this dealer exposes a public JSON API)",
 *     "Hits api.goldbars.ro/api/search directly, not the goldbars.ro storefront — the storefront's category pages render their product grid client-side (\"Produsele se incarca...\"), the raw HTML never contains it",
 *     "weight_grams from the API is already the dealer's own fine-weight figure for named historical coins (e.g. 3.44g for a 1 Ducat), not gross — PurityEstimator's range-matching for those coins snaps to its own canonical fine-weight constants regardless, and its bar-purity multiplier is ~0.9999 for 999.9 bars, so passing it straight through as weight_g does not double-discount"
 *   ],
 *   "agent_instructions": "This is the Goldbars.ro dealer API adapter. The /api/search endpoint ignores category/type filter params and just paginates the entire catalog (bars, coins, all metals) — no need for per-category requests."
 * }
 */

import { IScraperStrategy } from '../../domain/IScraperStrategy';
import { StandardizedProduct, ProductSchema, detectMetal } from '../../domain/Product';
import { fetchWithTimeout, politeDelay } from './httpClient';

interface GoldbarsProduct {
  id: number;
  slug: string;
  name: string;
  price: number;
  weight_grams: number;
  stock: number;
  buyback_price: number | null;
}

interface GoldbarsSearchResponse {
  data: GoldbarsProduct[];
}

export class GoldbarsScraper implements IScraperStrategy {
  get providerName(): string {
    return 'Goldbars';
  }

  async scrape(): Promise<StandardizedProduct[]> {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    };

    const products: StandardizedProduct[] = [];

    for (let page = 1; page <= 40; page++) {
      if (page > 1) await politeDelay();

      const url = `https://api.goldbars.ro/api/search?page=${page}`;

      try {
        console.log(`Scraping Goldbars page ${page}: ${url}`);
        const response = await fetchWithTimeout(url, { headers });
        if (!response.ok) {
          console.error(`Error scraping Goldbars page ${page}: HTTP ${response.status}`);
          break;
        }

        const body: GoldbarsSearchResponse = await response.json();
        if (body.data.length === 0) {
          console.log(`No more products found on page ${page}. Stopping pagination.`);
          break;
        }

        for (const item of body.data) {
          const link = `https://goldbars.ro/catalog/${item.slug}`;
          const metal = detectMetal(item.name, link);
          if (!metal) continue;

          const weight_g = item.weight_grams;
          if (weight_g === null || weight_g <= 0) continue;

          const sell_price_ron = item.price;
          const buy_price_ron = item.buyback_price && item.buyback_price > 0 ? item.buyback_price : null;
          const stock_status = item.stock > 0 ? 'In Stock' : 'Out of Stock';

          const sell_price_per_g_ron = parseFloat((sell_price_ron / weight_g).toFixed(2));
          const buy_price_per_g_ron = buy_price_ron !== null ? parseFloat((buy_price_ron / weight_g).toFixed(2)) : null;

          const parsedData = ProductSchema.safeParse({
            provider: this.providerName,
            sku: String(item.id),
            name: item.name,
            url: link,
            weight_g,
            stock_status,
            buy_price_ron,
            sell_price_ron,
            buy_price_per_g_ron,
            sell_price_per_g_ron,
            metal
          });

          if (parsedData.success) {
            products.push(parsedData.data);
          } else {
            console.warn('[Goldbars Scraper] Invalid product parsing outcome:', parsedData.error);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error scraping Goldbars page ${page}:`, message);
        break;
      }
    }

    return products;
  }
}
