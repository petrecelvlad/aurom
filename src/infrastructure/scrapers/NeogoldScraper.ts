import * as cheerio from 'cheerio';
/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": [
 *     "Implements the IScraperStrategy port",
 *     "Dependencies: cheerio, WeightConverter, PriceParser, fetchWithTimeout (no axios — Workers-native fetch)",
 *     "Fragile label/price DOM matching — see PROVIDER_SCRAPING_SPECS.md Neogold Autopsy"
 *   ],
 *   "agent_instructions": "This is the Neogold dealer website scraper adapter. Iterates 5 WooCommerce category pages. Ensure you handle missing properties gracefully and log errors clearly."
 * }
 */

import { IScraperStrategy } from '../../domain/IScraperStrategy';
import { StandardizedProduct, ProductSchema, detectMetal } from '../../domain/Product';
import { WeightConverter } from '../../domain/WeightConverter';
import { PriceParser } from '../../domain/PriceParser';
import { fetchWithTimeout } from './httpClient';

export class NeogoldScraper implements IScraperStrategy {
  get providerName(): string {
    return 'Neogold';
  }

  private determineStockStatus(cardText: string): 'In Stock' | 'Out of Stock' {
    const normalized = cardText.toLowerCase();
    if (normalized.includes('out of stock') || normalized.includes('epuizat') || normalized.includes('stoc epuizat')) {
      return 'Out of Stock';
    }
    return 'In Stock';
  }

  async scrape(): Promise<StandardizedProduct[]> {
    const categories = [
      'https://neogold.ro/categorie-produs/lingouri-aur/',
      'https://neogold.ro/categorie-produs/monede-aur/',
      'https://neogold.ro/categorie-produs/lingouri-argint/',
      'https://neogold.ro/categorie-produs/monede-argint/',
      'https://neogold.ro/categorie-produs/lingouri-platina/'
    ];

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    const uniqueProducts = new Map<string, StandardizedProduct>();

    for (const url of categories) {
      try {
        console.log(`Scraping Neogold category: ${url}`);
        const response = await fetchWithTimeout(url, { headers });
        if (response.status === 404) {
          console.warn(`Category not found (404) for Neogold: ${url}`);
          continue;
        }
        if (!response.ok) {
          console.error(`Error scraping Neogold category ${url}: HTTP ${response.status}`);
          continue;
        }
        const html = await response.text();
        const $ = cheerio.load(html);

        // Target the main product grid elements from the Wolmart theme layout
        let productElements = $('div.product, .product-wrap, .product-body');
        if (productElements.length === 0) {
          productElements = $('.product-loop, li.product');
        }
        
        if (productElements.length === 0) {
          continue;
        }

        productElements.each((_, el) => {
          const product = $(el);

          // 1. Name / Title
          const titleEl = product.find('.product-title a, .woocommerce-loop-product__title, h2, h3').first();
          const name = titleEl.text().trim();
          if (!name) return;

          // 2. Link / URL
          let link = titleEl.attr('href') || product.find('a').first().attr('href') || '';
          if (!link) return;

          // Filter by precious metal type
          const metal = detectMetal(name, link);
          if (!metal) return;

          // Filter out obvious non-investment products by ensuring weight is extractable
          const weight_g = WeightConverter.extractWeightInGrams(name);
          if (weight_g === null || weight_g <= 0) return;

          // 3. SKU / ID
          const rawId = product.attr('data-id') || 
                        product.attr('data-product-id') || 
                        product.attr('data-product_id') || 
                        product.find('[data-product-id]').attr('data-product-id') || 
                        product.find('[data-product_id]').attr('data-product_id');
                        
          const sku = rawId 
            ? `neogold-${rawId}` 
            : `neogold-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}`;

          // Get the full text footprint of the product card to parse custom inline nodes
          const cardText = product.text();

          // 4. Stock Status Mapping
          const stock_status = this.determineStockStatus(cardText + ' ' + (product.attr('class') || ''));

          // 5. Extract Prices (Sell vs Buy)
          let sellText = '';
          let buyText = '';

          const priceDivs = product.find('span.price > div');
          priceDivs.each((_, div) => {
            const text = $(div).text().toLowerCase();
            const bdiText = $(div).find('.amount bdi').text();
            
            if (text.includes('vindem')) {
              sellText = bdiText;
            } else if (text.includes('cumpăram') || text.includes('cumparam')) {
              buyText = bdiText;
            }
          });

          if (!sellText && !buyText) {
            // Fallback for direct price
            sellText = product.find('.price .amount bdi').first().text();
          }

          const cleanSellText = sellText.replace(/\u00a0/g, ' ').trim();
          const cleanBuyText = buyText.replace(/\u00a0/g, ' ').trim();

          const sell_price_ron = PriceParser.parseRonPrice(cleanSellText);
          const buy_price_ron = PriceParser.parseRonPrice(cleanBuyText);

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
          } else {
            console.warn('[Neogold Scraper] Invalid product parsing outcome:', parsedData.error);
          }
        });

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error scraping Neogold category ${url}:`, message);
      }
    }

    return Array.from(uniqueProducts.values());
  }
}

