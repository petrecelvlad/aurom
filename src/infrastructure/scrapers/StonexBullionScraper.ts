import * as cheerio from 'cheerio';
/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": [
 *     "Not an IScraperStrategy adapter — its output currency depends on the scraping request's geo-IP (StoneX has no Romanian storefront and no explicit currency override we could find), so it can't satisfy the port's StandardizedProduct contract directly",
 *     "Reads whichever currency symbol (€/£/$) actually appears in each scraped price and converts using the matching BNR rate, rather than assuming one currency — geo-IP-based currency selection means a GitHub Actions runner may see EUR, GBP, or USD on any given run",
 *     "Each category root page's pagination doesn't terminate at 0 — past the real inventory it repeats a fixed set of \"recommended\" cards forever. Stops on the first page that contributes zero URLs not already seen, not on an empty page.",
 *     "Dependencies: cheerio, WeightConverter, PurityEstimator, detectMetal, fetchWithTimeout (no axios — Workers-native fetch)"
 *   ],
 *   "agent_instructions": "Scrapes StoneX Bullion's 8 top-level category pages (gold/silver/platinum/palladium x bars/coins). No buy-back price is exposed on these listing cards (StoneX runs a separate /en/buyback/ flow) — buy_price_ron is always null, same as other sell-only dealers. convertStonexProductsToRon() is the only place that turns prices into RON; the composition root (scripts/scrapeAndIngest.ts) fetches the BNR rates and calls it before merging into the ingest payload."
 * }
 */

import { detectMetal, ProductSchema, StandardizedProduct } from '../../domain/Product';
import { WeightConverter } from '../../domain/WeightConverter';
import { PurityEstimator } from '../../domain/PurityEstimator';
import { fetchWithTimeout, politeDelay } from './httpClient';

export interface StonexProduct {
  sku: string;
  name: string;
  url: string;
  metal: 'Gold' | 'Silver' | 'Platinum' | 'Palladium';
  weightG: number | null;
  purity: number;
  karats: number | null;
  fineWeightG: number | null;
  price: number;
  currency: 'EUR' | 'GBP' | 'USD';
  stockStatus: 'In Stock' | 'Out of Stock';
}

const BASE_URL = 'https://stonexbullion.com';

const CATEGORY_PATHS = [
  '/en/gold-bars/',
  '/en/gold-coins/',
  '/en/silver-bars/',
  '/en/silver-coins/',
  '/en/platinum-bars/',
  '/en/platinum-coins/',
  '/en/palladium-bars/',
  '/en/palladium-coins/',
];

const MAX_PAGES_PER_CATEGORY = 20;

const CURRENCY_BY_SYMBOL: Record<string, 'EUR' | 'GBP' | 'USD'> = {
  '€': 'EUR',
  '£': 'GBP',
  '$': 'USD',
};

function parsePriceText(rawText: string): { price: number; currency: 'EUR' | 'GBP' | 'USD' } | null {
  const symbolMatch = rawText.match(/[€£$]/);
  if (!symbolMatch) return null;

  const currency = CURRENCY_BY_SYMBOL[symbolMatch[0]];
  const numeric = parseFloat(rawText.replace(/[^\d.]/g, ''));
  if (isNaN(numeric)) return null;

  return { price: numeric, currency };
}

export function parseStonexCategoryPage(html: string): StonexProduct[] {
  const $ = cheerio.load(html);
  const results: StonexProduct[] = [];

  $('.product-item-in-small').each((_, el) => {
    const card = $(el);
    const link = card.find('a.product-item').first();
    const href = link.attr('href');
    if (!href) return;

    const name = card.find('.card-title').first().text().trim();
    if (!name) return;

    const url = new URL(href, BASE_URL).toString();
    const metal = detectMetal(name, url);
    if (!metal) return;

    const weightG = WeightConverter.extractWeightInGrams(name);
    if (weightG === null || weightG <= 0) return;

    const { purity, karats, fineWeightG } = PurityEstimator.estimate(name, weightG, metal);

    const isSoldOut = card.find('.badge-sold-out').length > 0;
    const stockStatus: StonexProduct['stockStatus'] = isSoldOut ? 'Out of Stock' : 'In Stock';

    const priceText = card.find('.product-thumb-price .price, .font-size-18.price').first().text().trim();
    const parsedPrice = priceText ? parsePriceText(priceText) : null;
    if (!parsedPrice) return;

    const sku = href.replace(/\/+$/, '').split('/').pop() || href;

    results.push({
      sku,
      name,
      url,
      metal,
      weightG,
      purity,
      karats,
      fineWeightG,
      price: parsedPrice.price,
      currency: parsedPrice.currency,
      stockStatus,
    });
  });

  return results;
}

export class StonexBullionScraper {
  get providerName(): string {
    return 'StoneX Bullion';
  }

  async scrape(): Promise<StonexProduct[]> {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    };

    const seenUrls = new Set<string>();
    const results: StonexProduct[] = [];
    let isFirstRequest = true;

    for (const categoryPath of CATEGORY_PATHS) {
      for (let page = 1; page <= MAX_PAGES_PER_CATEGORY; page++) {
        if (!isFirstRequest) await politeDelay();
        isFirstRequest = false;

        const url = page === 1
          ? `${BASE_URL}${categoryPath}`
          : `${BASE_URL}${categoryPath}?page=${page}`;

        try {
          console.log(`Scraping StoneX Bullion: ${url}`);
          const response = await fetchWithTimeout(url, { headers });
          if (!response.ok) {
            console.error(`Error scraping StoneX Bullion ${url}: HTTP ${response.status}`);
            break;
          }

          const html = await response.text();
          const pageProducts = parseStonexCategoryPage(html);

          const newProducts = pageProducts.filter(p => !seenUrls.has(p.url));
          if (newProducts.length === 0) {
            break;
          }

          for (const product of newProducts) {
            seenUrls.add(product.url);
            results.push(product);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Error scraping StoneX Bullion ${url}:`, message);
          break;
        }
      }
    }

    return results;
  }
}

/**
 * Converts StoneX products (each priced in whatever currency the scraping request's geo-IP
 * resolved to) into StandardizedProduct RON figures, using BNR rates for all three currencies
 * since which one shows up is not under our control.
 */
export function convertStonexProductsToRon(
  products: StonexProduct[],
  ratesToRon: { EUR: number; GBP: number; USD: number }
): StandardizedProduct[] {
  const results: StandardizedProduct[] = [];

  for (const product of products) {
    const rate = ratesToRon[product.currency];
    const sell_price_ron = parseFloat((product.price * rate).toFixed(2));
    const fineWeight = product.fineWeightG || product.weightG;
    const sell_price_per_g_ron = fineWeight ? parseFloat((sell_price_ron / fineWeight).toFixed(2)) : null;

    const parsed = ProductSchema.safeParse({
      provider: 'StoneX Bullion',
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
      console.warn('Skipping invalid StoneX Bullion product during RON conversion:', parsed.error);
    }
  }

  return results;
}
