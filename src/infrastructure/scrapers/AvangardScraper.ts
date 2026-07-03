/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": [
 *     "Implements the IScraperStrategy port",
 *     "Dependencies: WeightConverter, fetchWithTimeout (no axios — Workers-native fetch)",
 *     "Sources from the unauthenticated Shopify /products.json endpoint, not HTML"
 *   ],
 *   "agent_instructions": "This is the Avangard Gold dealer scraper adapter. Iterates products and their variants from the Shopify JSON API. Ensure you handle missing properties gracefully and log errors clearly."
 * }
 */

import { IScraperStrategy } from '../../domain/IScraperStrategy';
import { StandardizedProduct, ProductSchema, detectMetal } from '../../domain/Product';
import { WeightConverter } from '../../domain/WeightConverter';
import { fetchWithTimeout } from './httpClient';

export class AvangardScraper implements IScraperStrategy {
  get providerName(): string {
    return 'Avangard Gold';
  }

  async scrape(): Promise<StandardizedProduct[]> {
    const url = 'https://avangardgold.ro/products.json?limit=250';
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    };

    const results: StandardizedProduct[] = [];

    try {
      console.log(`Scraping Avangard Gold via Shopify JSON API: ${url}`);
      const response = await fetchWithTimeout(url, { headers });
      if (!response.ok) {
        console.error(`Error scraping Avangard Gold: HTTP ${response.status}`);
        return [];
      }
      const data = await response.json() as { products?: unknown };

      if (!data || !Array.isArray(data.products)) {
        console.warn('Avangard Gold API response format is invalid or empty');
        return [];
      }

      const products = data.products as any[];

      for (const product of products) {
        const tagsStr = Array.isArray(product.tags) ? product.tags.join(' ') : String(product.tags || '');
        const productType = product.product_type || '';
        const handle = product.handle || '';
        const productUrl = handle ? `https://avangardgold.ro/products/${handle}` : '#';

        if (!product.variants || !Array.isArray(product.variants)) {
          continue;
        }

        for (const variant of product.variants) {
          const variantTitle = variant.title || '';
          const name = variantTitle.toLowerCase() === 'default title' 
            ? product.title 
            : `${product.title} (${variantTitle})`;

          // Determine precious metal type
          const searchContext = `${name} ${productType} ${tagsStr}`.toLowerCase();
          const metal = detectMetal(searchContext, productUrl);
          
          if (!metal) {
            // Exclude everything that is not gold, silver, platinum, or palladium
            continue;
          }

          // Determine weight in grams
          let weight_g: number | null = null;
          if (variant.weight && typeof variant.weight === 'number' && variant.weight > 0) {
            const unit = (variant.weight_unit || 'g').toLowerCase();
            if (unit === 'kg') {
              weight_g = variant.weight * 1000;
            } else if (unit === 'oz' || unit === 'onza') {
              weight_g = variant.weight * 31.1034768;
            } else {
              weight_g = variant.weight;
            }
          } else if (variant.grams && typeof variant.grams === 'number' && variant.grams > 0) {
            weight_g = variant.grams;
          }

          // Fallback to title extraction
          if (weight_g === null) {
            weight_g = WeightConverter.extractWeightInGrams(name);
          }

          // Skip if we cannot identify a valid weight
          if (weight_g === null || weight_g <= 0) {
            continue;
          }

          // Stock Status
          const isOutOfStock = variant.available === false || 
                               (variant.inventory_quantity !== undefined && 
                                variant.inventory_quantity <= 0 && 
                                variant.inventory_policy === 'deny');
          const stock_status = isOutOfStock ? 'Out of Stock' : 'In Stock';

          // Prices
          const sell_price_ron = variant.price ? parseFloat(variant.price) : null;
          const buy_price_ron = null; // Shopify public product endpoint doesn't contain custom buyback info

          const sell_price_per_g_ron = (sell_price_ron && weight_g) 
            ? parseFloat((sell_price_ron / weight_g).toFixed(2)) 
            : null;
          const buy_price_per_g_ron = null;

          const sku = variant.sku || `avangard-${product.id}-${variant.id}`;

          const parsedData = ProductSchema.safeParse({
            provider: this.providerName,
            sku,
            name,
            url: productUrl,
            weight_g,
            stock_status,
            buy_price_ron,
            sell_price_ron,
            buy_price_per_g_ron,
            sell_price_per_g_ron,
            metal
          });

          if (parsedData.success) {
            results.push(parsedData.data);
          } else {
            console.warn('Skipping invalid product data for Avangard:', parsedData.error);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error scraping Avangard Gold:', message);
    }

    return results;
  }
}
