/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": [
 *     "Not an IScraperStrategy adapter — its output currency is EUR, not RON, so it can't satisfy the port's StandardizedProduct contract directly",
 *     "parseCategoryPage is a pure transformation (HTML string in, MuenzeProduct[] out) — no network access, safe to test directly against cone/project/specs/muenze_bars.md and muenze_coins.md",
 *     "convertMuenzeProductsToRon is also a pure transformation — takes the EUR/RON rate as a parameter rather than fetching it, so callers control (and can share) the BNR fetch",
 *     "Münze Österreich publishes only a purchase price, no buy-back offer, so buy_price_ron/buy_price_per_g_ron are always null — same pattern as other sell-only Romanian dealers",
 *     "Dependencies: cheerio, WeightConverter, PurityEstimator, detectMetal, fetchWithTimeout (no axios — Workers-native fetch)"
 *   ],
 *   "agent_instructions": "Scrapes Münze Österreich's (Austrian Mint) gold bar and investment coin listing pages. Prices on this site are EUR — convertMuenzeProductsToRon() is the only place that turns them into RON, using the same BNR EUR/RON rate fetched via BnrBenchmarkClient. The composition root (scripts/scrapeAndIngest.ts) is responsible for fetching that rate and calling this conversion before merging into the ingest payload."
 * }
 */

import * as cheerio from 'cheerio';
import { detectMetal, ProductSchema, StandardizedProduct } from '../../domain/Product';
import { WeightConverter } from '../../domain/WeightConverter';
import { PurityEstimator } from '../../domain/PurityEstimator';
import { fetchWithTimeout, politeDelay } from './httpClient';

export interface MuenzeProduct {
  provider: 'MuenzeOesterreich';
  sku: string;
  name: string;
  url: string;
  imageUrl: string | null;
  metal: 'Gold' | 'Silver' | 'Platinum' | 'Palladium';
  weightG: number | null;
  purity: number;
  karats: number | null;
  fineWeightG: number | null;
  priceEur: number;
  stockStatus: 'In Stock' | 'Out of Stock';
}

const BASE_URL = 'https://www.muenzeoesterreich.com';

const CATEGORY_URLS = [
  `${BASE_URL}/en/invest/gold-bars`,
  `${BASE_URL}/en/invest/investment-coins/all-investment-coins`,
];

export class MuenzeOesterreichScraper {
  get providerName(): string {
    return 'MuenzeOesterreich';
  }

  static parseCategoryPage(html: string): MuenzeProduct[] {
    const $ = cheerio.load(html);
    const results: MuenzeProduct[] = [];

    $('.card.coin').each((_, element) => {
      const card = $(element);
      const cardImage = card.find('.card-image').first();

      const name = cardImage.attr('data-name');
      const sku = cardImage.attr('data-sku');
      const priceAttr = cardImage.attr('data-price');
      const priceEur = priceAttr ? parseFloat(priceAttr) : NaN;

      if (!name || !sku || isNaN(priceEur)) {
        console.warn('Skipping Muenze Österreich card with missing name/sku/price:', name, sku, priceAttr);
        return;
      }

      const relativeUrl = card.find('.coin-product-detail a').first().attr('href');
      const url = relativeUrl ? new URL(relativeUrl, BASE_URL).toString() : BASE_URL;

      const imageUrl = card.find('.card-image img').first().attr('src') || null;

      const metal = detectMetal(name, url);
      if (!metal) {
        console.warn(`Skipping Muenze Österreich product with undetectable metal: "${name}"`);
        return;
      }

      const weightG = WeightConverter.extractWeightInGrams(name);
      const { purity, karats, fineWeightG } = PurityEstimator.estimate(name, weightG, metal);

      const stockStatus: MuenzeProduct['stockStatus'] = card.hasClass('sold-out') ? 'Out of Stock' : 'In Stock';

      results.push({
        provider: 'MuenzeOesterreich',
        sku,
        name,
        url,
        imageUrl,
        metal,
        weightG,
        purity,
        karats,
        fineWeightG,
        priceEur,
        stockStatus,
      });
    });

    return results;
  }

  async scrape(): Promise<MuenzeProduct[]> {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    };

    const results: MuenzeProduct[] = [];

    for (const [index, url] of CATEGORY_URLS.entries()) {
      if (index > 0) await politeDelay();

      try {
        console.log(`Scraping Muenze Österreich category page: ${url}`);
        const response = await fetchWithTimeout(url, { headers });
        if (!response.ok) {
          console.error(`Error scraping Muenze Österreich url ${url}: HTTP ${response.status}`);
          continue;
        }
        const html = await response.text();
        results.push(...MuenzeOesterreichScraper.parseCategoryPage(html));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error scraping Muenze Österreich url ${url}:`, message);
      }
    }

    return results;
  }
}

/**
 * Converts EUR-priced Muenze products into StandardizedProduct RON figures using the given
 * EUR/RON rate (from BnrBenchmarkClient's `eur.price` — RON per 1 EUR).
 */
export function convertMuenzeProductsToRon(products: MuenzeProduct[], eurToRonRate: number): StandardizedProduct[] {
  const results: StandardizedProduct[] = [];

  for (const product of products) {
    const sell_price_ron = parseFloat((product.priceEur * eurToRonRate).toFixed(2));
    const fineWeight = product.fineWeightG || product.weightG;
    const sell_price_per_g_ron = fineWeight ? parseFloat((sell_price_ron / fineWeight).toFixed(2)) : null;

    const parsed = ProductSchema.safeParse({
      provider: product.provider,
      sku: product.sku,
      name: product.name,
      url: product.url,
      weight_g: product.weightG,
      stock_status: product.stockStatus,
      buy_price_ron: null,
      sell_price_ron,
      sell_price_per_g_ron,
      buy_price_per_g_ron: null,
      metal: product.metal,
      purity: product.purity,
      karats: product.karats,
      fine_weight_g: product.fineWeightG,
    });

    if (parsed.success) {
      results.push(parsed.data);
    } else {
      console.warn('Skipping invalid Muenze Österreich product during RON conversion:', parsed.error);
    }
  }

  return results;
}
