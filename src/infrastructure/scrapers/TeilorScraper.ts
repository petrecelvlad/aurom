import * as cheerio from 'cheerio';
/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": [
 *     "Implements the IScraperStrategy port",
 *     "Dependencies: cheerio, WeightConverter, fetchWithTimeout (no axios — Workers-native fetch)",
 *     "Reads the Next.js __NEXT_DATA__ SSR payload directly instead of parsing rendered price text — Teilor ships structured JSON (sku, ro_price in bani, stock count) in the initial HTML response",
 *     "ro_price is an integer in bani (RON subunits) — divide by 100. This is a currency-subunit conversion, not Romanian price-string parsing, so PriceParser does not apply here (see its own constraints)."
 *   ],
 *   "agent_instructions": "This is the Teilor dealer website scraper adapter. Currently a single category page (gold bars) with no real pagination — see the totalPages guard below before assuming that stays true."
 * }
 */

import { IScraperStrategy } from '../../domain/IScraperStrategy';
import { StandardizedProduct, ProductSchema, detectMetal } from '../../domain/Product';
import { WeightConverter } from '../../domain/WeightConverter';
import { fetchWithTimeout } from './httpClient';

interface TeilorHit {
  sku: string;
  ro_name: string;
  ro_price: number;
  stock: number;
}

interface TeilorPageProps {
  initialHits: TeilorHit[];
  totalPages: number;
}

export class TeilorScraper implements IScraperStrategy {
  get providerName(): string {
    return 'Teilor';
  }

  async scrape(): Promise<StandardizedProduct[]> {
    const url = 'https://www.teilor.ro/lingouri-de-aur';
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    };

    const products: StandardizedProduct[] = [];

    try {
      console.log(`Scraping Teilor: ${url}`);
      const response = await fetchWithTimeout(url, { headers });
      if (!response.ok) {
        console.error(`Error scraping Teilor: HTTP ${response.status}`);
        return products;
      }
      const html = await response.text();
      const $ = cheerio.load(html);

      const rawJson = $('#__NEXT_DATA__').html();
      if (!rawJson) {
        console.error('Teilor: __NEXT_DATA__ payload not found, page structure may have changed');
        return products;
      }

      const pageProps: TeilorPageProps = JSON.parse(rawJson).props.pageProps;

      if (pageProps.totalPages > 1) {
        console.error(`Teilor: catalog now spans ${pageProps.totalPages} pages but this scraper only reads page 1 — extend it, don't silently drop products (see the Aurom Investment pagination-cap bug for why this matters)`);
      }

      for (const hit of pageProps.initialHits) {
        const name = hit.ro_name;

        const linkMatch = html.match(new RegExp(`href="(/product/[^"]*-${hit.sku}-[a-z]{2})"`));
        const link = linkMatch ? `https://www.teilor.ro${linkMatch[1]}` : url;

        const metal = detectMetal(name, link);
        if (!metal) continue;

        const weight_g = WeightConverter.extractWeightInGrams(name);
        if (weight_g === null || weight_g <= 0) continue;

        const sell_price_ron = parseFloat((hit.ro_price / 100).toFixed(2));
        const sell_price_per_g_ron = parseFloat((sell_price_ron / weight_g).toFixed(2));
        const stock_status = hit.stock > 0 ? 'In Stock' : 'Out of Stock';

        const parsedData = ProductSchema.safeParse({
          provider: this.providerName,
          sku: hit.sku,
          name,
          url: link,
          weight_g,
          stock_status,
          buy_price_ron: null,
          sell_price_ron,
          buy_price_per_g_ron: null,
          sell_price_per_g_ron,
          metal
        });

        if (parsedData.success) {
          products.push(parsedData.data);
        } else {
          console.warn('[Teilor Scraper] Invalid product parsing outcome:', parsedData.error);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error scraping Teilor:', message);
    }

    return products;
  }
}
