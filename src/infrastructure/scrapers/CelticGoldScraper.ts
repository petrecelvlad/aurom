import * as cheerio from 'cheerio';
/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": [
 *     "Not an IScraperStrategy adapter — output currency is EUR, not RON, same non-conforming pattern as Münze Österreich",
 *     "Runs on Odoo's website_sale module (class names prefixed o_wsale_/tp-) — a different platform from every other scraper in this codebase, none of which are WooCommerce/Prestashop conventions",
 *     "Only gold and silver are carried — no platinum/palladium categories exist on this site",
 *     "The 4 CATEGORY_PATHS are each an umbrella \"all weights\" category (e.g. buy-gold-bars-by-weight-18), not per-weight subfolders — pagination via /page/N covers the whole metal+form combination in one crawl",
 *     "No sold-out signal was found in recon (no \"out of stock\" text, no missing add-to-cart button on any real physical product) — stock_status defaults to 'In Stock' for every parsed card",
 *     "Uniquely among current scrapers, this dealer publishes a real buy-back price on listing cards (.oe_sellback_price) — the second .oe_currency_value in a card, when present"
 *   ],
 *   "agent_instructions": "convertCelticGoldProductsToRon() is the only place that turns EUR into RON, using the BNR EUR rate. The composition root (scripts/scrapeAndIngest.ts) fetches that rate and calls it before merging into the ingest payload, same pattern as Muenze Österreich and BullionByPost."
 * }
 */

import { detectMetal, ProductSchema, StandardizedProduct } from '../../domain/Product';
import { WeightConverter } from '../../domain/WeightConverter';
import { PurityEstimator } from '../../domain/PurityEstimator';
import { fetchWithTimeout, politeDelay } from './httpClient';

export interface CelticGoldProduct {
  sku: string;
  name: string;
  url: string;
  metal: 'Gold' | 'Silver';
  weightG: number | null;
  purity: number;
  karats: number | null;
  fineWeightG: number | null;
  priceEur: number;
  buybackPriceEur: number | null;
}

const BASE_URL = 'https://celticgold.eu';

const CATEGORY_PATHS = [
  '/shop/category/buy-gold-bars-by-weight-18',
  '/shop/category/buy-gold-coins-by-weight-17',
  '/shop/category/buy-silver-bars-by-weight-20',
  '/shop/category/buy-silver-coins-by-weight-22',
];

const MAX_PAGES_PER_CATEGORY = 45;

export function parseCelticGoldCategoryPage(html: string): CelticGoldProduct[] {
  const $ = cheerio.load(html);
  const results: CelticGoldProduct[] = [];

  $('.tp-product-item').each((_, el) => {
    const card = $(el);
    const link = card.find('a.tp-link-dark').first();
    const href = link.attr('href');
    if (!href) return;

    const name = card.find('.tp-product-title').first().text().trim() || link.text().trim();
    if (!name) return;

    const url = new URL(href, BASE_URL).toString();
    const metal = detectMetal(name, url);
    if (metal !== 'Gold' && metal !== 'Silver') return;

    const weightG = WeightConverter.extractWeightInGrams(name);
    if (weightG === null || weightG <= 0) return;

    const { purity, karats, fineWeightG } = PurityEstimator.estimate(name, weightG, metal);

    const currencyValues = card.find('.oe_currency_value');
    const priceEur = parseFloat($(currencyValues.get(0)).text().replace(/[^\d.]/g, ''));
    if (isNaN(priceEur)) return;

    const buybackPriceEur = currencyValues.length > 1
      ? parseFloat($(currencyValues.get(1)).text().replace(/[^\d.]/g, ''))
      : NaN;

    const sku = href.split('/').pop()?.split('?')[0] || href;

    results.push({
      sku,
      name,
      url,
      metal,
      weightG,
      purity,
      karats,
      fineWeightG,
      priceEur,
      buybackPriceEur: isNaN(buybackPriceEur) ? null : buybackPriceEur,
    });
  });

  return results;
}

export class CelticGoldScraper {
  get providerName(): string {
    return 'CelticGold';
  }

  async scrape(): Promise<CelticGoldProduct[]> {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    };

    const seenUrls = new Set<string>();
    const results: CelticGoldProduct[] = [];
    let isFirstRequest = true;

    for (const categoryPath of CATEGORY_PATHS) {
      for (let page = 1; page <= MAX_PAGES_PER_CATEGORY; page++) {
        if (!isFirstRequest) await politeDelay();
        isFirstRequest = false;

        const url = page === 1
          ? `${BASE_URL}${categoryPath}`
          : `${BASE_URL}${categoryPath}/page/${page}`;

        try {
          console.log(`Scraping CelticGold: ${url}`);
          const response = await fetchWithTimeout(url, { headers });
          if (!response.ok) {
            console.error(`Error scraping CelticGold ${url}: HTTP ${response.status}`);
            break;
          }

          const html = await response.text();
          const pageProducts = parseCelticGoldCategoryPage(html);

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
          console.error(`Error scraping CelticGold ${url}:`, message);
          break;
        }
      }
    }

    return results;
  }
}

/**
 * Converts CelticGold's EUR prices into StandardizedProduct RON figures using the given
 * EUR/RON rate (from BnrBenchmarkClient's `eur.price` — RON per 1 EUR).
 */
export function convertCelticGoldProductsToRon(
  products: CelticGoldProduct[],
  eurToRonRate: number
): StandardizedProduct[] {
  const results: StandardizedProduct[] = [];

  for (const product of products) {
    const sell_price_ron = parseFloat((product.priceEur * eurToRonRate).toFixed(2));
    const buy_price_ron = product.buybackPriceEur !== null
      ? parseFloat((product.buybackPriceEur * eurToRonRate).toFixed(2))
      : null;
    const fineWeight = product.fineWeightG || product.weightG;
    const sell_price_per_g_ron = fineWeight ? parseFloat((sell_price_ron / fineWeight).toFixed(2)) : null;
    const buy_price_per_g_ron = fineWeight && buy_price_ron !== null
      ? parseFloat((buy_price_ron / fineWeight).toFixed(2))
      : null;

    const parsed = ProductSchema.safeParse({
      provider: 'CelticGold',
      sku: product.sku,
      name: product.name,
      url: product.url,
      weight_g: product.weightG,
      stock_status: 'In Stock',
      buy_price_ron,
      sell_price_ron,
      sell_price_per_g_ron,
      buy_price_per_g_ron,
      metal: product.metal,
      purity: product.purity,
      karats: product.karats,
      fine_weight_g: product.fineWeightG,
    });

    if (parsed.success) {
      results.push(parsed.data);
    } else {
      console.warn('Skipping invalid CelticGold product during RON conversion:', parsed.error);
    }
  }

  return results;
}
