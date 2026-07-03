/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": [
 *     "Implements the IScraperStrategy port",
 *     "Dependencies: axios, cheerio, WeightConverter"
 *   ],
 *   "agent_instructions": "This is the Tavex dealer website scraper adapter. Scrapes gold and silver category pages. Parses standard product formats using cheerio selectors. Ensure you handle missing properties gracefully and log errors clearly."
 * }
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { IScraperStrategy } from '../../domain/IScraperStrategy';
import { StandardizedProduct, ProductSchema, detectMetal } from '../../domain/Product';
import { WeightConverter } from '../../domain/WeightConverter';

export class TavexScraper implements IScraperStrategy {
  get providerName(): string {
    return 'Tavex';
  }

  async scrape(): Promise<StandardizedProduct[]> {
    const urls = [
      'https://tavex.ro/aur/',
      'https://tavex.ro/argint/'
    ];
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    };

    const results: StandardizedProduct[] = [];

    for (const url of urls) {
      try {
        console.log(`Scraping Tavex category page: ${url}`);
        const response = await axios.get(url, { headers, timeout: 15000 });
        const $ = cheerio.load(response.data);
        
        const schemaItems = new Map<string, any>();
        $('script[type="application/ld+json"]').each((_, e) => {
          try {
            const data = JSON.parse($(e).text());
            if (data['@type'] === 'CollectionPage' && data.mainEntity && data.mainEntity.itemListElement) {
              data.mainEntity.itemListElement.forEach((i: any) => {
                if (i.item && i.item.sku) {
                  schemaItems.set(i.item.sku, i.item);
                }
              });
            }
          } catch (err) {
            // Ignore parse errors
          }
        });

        const products = $('.js-product:not(.product--listing)');
        
        products.each((_, element) => {
          const product = $(element);
          const sku = product.find('.actions__button').attr('data-id') || 'unknown';
          const schemaData = schemaItems.get(sku) || {};
          
          const name = product.find('.product__title-inner').first().text().trim() || schemaData.name || 'Unknown';
          const link = product.find('a.product__overlay-link').first().attr('href') || schemaData.url || '#';
          
          // Classify precious metal
          const metal = detectMetal(name, link);
          if (!metal) {
            // Exclude everything else (accessories, non-metals)
            return;
          }

          const stock_status_raw = product.find('.product__stock').first().text().trim() || 'Unknown';
          let stock_status = 'Unknown';
          const lowerStatus = stock_status_raw.toLowerCase();
          if (lowerStatus.includes('stoc epuizat')) stock_status = 'Out of Stock';
          else if (lowerStatus.includes('în stoc') || lowerStatus.includes('in stoc')) stock_status = 'In Stock';
          
          let buy_price_ron: number | null = null;
          let sell_price_ron: number | null = null;
          
          const priceAttr = product.find('.js-product-price-from').first().attr('data-pricelist');
          if (priceAttr) {
            try {
              const priceData = JSON.parse(priceAttr);
              if (priceData.sell && priceData.sell.length > 0) sell_price_ron = priceData.sell[0].price;
              if (priceData.buy && priceData.buy.length > 0) buy_price_ron = priceData.buy[0].price;
            } catch (e) {}
          }

          let weight_g: number | null = null;
          if (schemaData.weight && schemaData.weight.value) {
            let val = 0;
            const rawVal = String(schemaData.weight.value).trim();
            if (rawVal.includes('/')) {
              const parts = rawVal.split('/');
              const num = parseFloat(parts[0]);
              const den = parseFloat(parts[1]);
              if (!isNaN(num) && !isNaN(den) && den !== 0) {
                val = num / den;
              }
            } else {
              val = parseFloat(rawVal.replace(',', '.'));
            }

            if (!isNaN(val) && val > 0) {
              const unit = (schemaData.weight.unitCode || '').toLowerCase();
              if (unit === 'kg') {
                weight_g = val * 1000;
              } else if (unit === 'oz' || unit === 'uncie' || unit === 'uncii' || unit === 'ounce' || unit === 'ounces') {
                weight_g = val * 31.1034768;
              } else {
                weight_g = val;
              }
            }
          }
          
          if (weight_g === null) {
            weight_g = WeightConverter.extractWeightInGrams(name);
          }
          
          const sell_price_per_g_ron = (sell_price_ron && weight_g) ? parseFloat((sell_price_ron / weight_g).toFixed(2)) : null;
          const buy_price_per_g_ron = (buy_price_ron && weight_g) ? parseFloat((buy_price_ron / weight_g).toFixed(2)) : null;
          
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
              results.push(parsedData.data);
          } else {
              console.warn('Skipping invalid product data for Tavex:', parsedData.error);
          }
        });
      } catch (err: any) {
        console.error(`Error scraping Tavex url ${url}:`, err.message);
      }
    }
    
    return results;
  }
}

