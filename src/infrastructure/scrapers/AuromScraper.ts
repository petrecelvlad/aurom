import * as cheerio from 'cheerio';
/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": [
 *     "Implements the IScraperStrategy port",
 *     "Dependencies: cheerio, WeightConverter, PriceParser, fetchWithTimeout (no axios — Workers-native fetch)"
 *   ],
 *   "agent_instructions": "This is the Aurom Investment dealer website scraper adapter. Paginates the WooCommerce shop up to 10 pages. Ensure you handle missing properties gracefully and log errors clearly."
 * }
 */

import { IScraperStrategy } from '../../domain/IScraperStrategy';
import { StandardizedProduct, ProductSchema, detectMetal } from '../../domain/Product';
import { WeightConverter } from '../../domain/WeightConverter';
import { PriceParser } from '../../domain/PriceParser';
import { fetchWithTimeout, politeDelay } from './httpClient';

export class AuromScraper implements IScraperStrategy {
  get providerName(): string {
    return 'Aurom Investment';
  }

  async scrape(): Promise<StandardizedProduct[]> {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    };

    const uniqueProducts = new Map<string, StandardizedProduct>();
    
    // The catalog has outgrown a fixed page count before (was capped at 10 while the
    // real shop ran to ~18 pages, silently dropping everything past it — e.g. the 20g
    // Valcambi bar). Cap high and rely on the 404/empty-page checks below to stop for real.
    for (let page = 1; page <= 30; page++) {
      const url = page === 1
        ? 'https://aurominvestment.ro/shop/'
        : `https://aurominvestment.ro/shop/page/${page}/`;

      if (page > 1) await politeDelay();

      try {
        console.log(`Scraping Aurom page ${page}: ${url}`);
        const response = await fetchWithTimeout(url, { headers });
        if (response.status === 404) {
          console.log(`Aurom page ${page} returned 404. Stopping pagination.`);
          break;
        }
        if (!response.ok) {
          console.error(`Error scraping Aurom page ${page}: HTTP ${response.status}`);
          break;
        }
        const html = await response.text();
        const $ = cheerio.load(html);

        const productElements = $('li.product');
        if (productElements.length === 0) {
          console.log(`No more products found on page ${page}. Stopping pagination.`);
          break;
        }

        let addedOnPage = 0;

        productElements.each((idx, el) => {
          const product = $(el);
          
          // 1. Title / Name
          const titleEl = product.find('.woocommerce-loop-product__title');
          const name = titleEl.text().trim() || product.find('h2').text().trim() || 'Unknown Product';
          
          // 2. SKU / ID
          const rawSku = product.attr('data-product_id');
          const sku = rawSku ? String(rawSku) : `aurom-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          
          // 3. URL
          const linkEl = product.find('.woocommerce-LoopProduct-link, a').first();
          const link = linkEl.attr('href') || '';

          // Filter by precious metal type (exclude gems, boxes, accessories)
          const metal = detectMetal(name, link);
          if (!metal) {
            return; // Skip non-precious metals
          }

          // Filter out obvious non-investment products (like boxes, accessories)
          // We only want products where we can calculate weight_g
          const weight_g = WeightConverter.extractWeightInGrams(name);
          if (weight_g === null) {
            return; // Skip accessory or non-weighted items
          }
          
          // 4. Stock Status Mapping
          const classesAttr = product.attr('class') || '';
          const classes = classesAttr.split(' ');
          let stock_status = 'In Stock'; // Default to In Stock unless out of stock class found
          if (classes.includes('outofstock') || classes.includes('out-of-stock')) {
            stock_status = 'Out of Stock';
          }
          
          // 5. Extract Prices (Sell vs Buy)
          // WooCommerce usually shows only the selling price on shop pages.
          const sellPriceEl = product.find('.price .amount').last();
          const sell_price_ron = sellPriceEl.length ? PriceParser.parseRonPrice(sellPriceEl.text()) : null;
          
          // Aurom usually doesn't have buy-back rates on the general listing page
          const buy_price_ron: number | null = null; 

          // 6. Calculate Per-Gram Metrics
          let sell_price_per_g_ron: number | null = null;
          let buy_price_per_g_ron: number | null = null;
          
          if (weight_g > 0) {
            if (sell_price_ron) {
              sell_price_per_g_ron = parseFloat((sell_price_ron / weight_g).toFixed(2));
            }
            if (buy_price_ron) {
              buy_price_per_g_ron = parseFloat((buy_price_ron / weight_g).toFixed(2));
            }
          }

          const parsedData = ProductSchema.safeParse({
            provider: this.providerName,
            sku,
            name,
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
            uniqueProducts.set(sku, parsedData.data);
            addedOnPage++;
          } else {
            console.warn('Skipping invalid product data for Aurom:', parsedData.error);
          }
        });

        console.log(`Page ${page} parsed: found ${productElements.length} products, added ${addedOnPage} weighted items.`);
        
        // If we found products but none of them had valid weights (unlikely unless page is all accessories),
        // we still continue, but let's log it.
        if (addedOnPage === 0 && productElements.length > 0) {
          console.log(`Zero weighted items found on page ${page}.`);
        }

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error scraping Aurom page ${page}:`, message);
        break; // Stop pagination on error to be safe
      }
    }

    return Array.from(uniqueProducts.values());
  }
}
