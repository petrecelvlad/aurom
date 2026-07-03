/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": [
 *     "Implements the IScraperStrategy port",
 *     "Sources from a daily PDF (Cotatii_Aur.pdf), not HTML — parses via pdf-parse and fixed regex per product",
 *     "Cached for 60 minutes upstream in server.ts, not 5, since the source PDF only updates daily"
 *   ],
 *   "agent_instructions": "This is the BCR bank gold-rate scraper adapter. If BCR changes the PDF layout, the fixed regex table for lingouri/monede will silently stop matching and return 0 products — check text extraction manually before assuming a code bug."
 * }
 */

import axios from 'axios';
import { IScraperStrategy } from '../../domain/IScraperStrategy';
import { StandardizedProduct, ProductSchema, detectMetal } from '../../domain/Product';

// We dynamically require pdf-parse to avoid issues in the frontend bundle if it's imported
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export class BCRScraper implements IScraperStrategy {
  get providerName(): string {
    return 'BCR';
  }

  async scrape(): Promise<StandardizedProduct[]> {
    const url = 'https://www.bcr.ro/content/dam/ro/bcr/www_bcr_ro/Aur/Cotatii_Aur.pdf';
    const results: StandardizedProduct[] = [];

    try {
      console.log(`Scraping BCR PDF: ${url}`);
      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
      const data = await pdf(response.data);
      const text = data.text;
      
      const lingouriRe = /(\d+)g bar.*?Good Delivery\1([\d,]+)/g;
      let match;
      while ((match = lingouriRe.exec(text)) !== null) {
        const weight_g = parseFloat(match[1]);
        const priceStr = match[2].replace(/,/g, '');
        const sell_price_ron = parseFloat(priceStr);
        
        const name = `Lingou Aur BCR Good Delivery ${weight_g}g`;
        const sku = `bcr-lingou-${weight_g}g`;
        
        const product = {
          provider: this.providerName,
          sku: sku,
          name: name,
          url: url,
          weight_g: weight_g,
          stock_status: 'In Stock',
          buy_price_ron: null,
          sell_price_ron: sell_price_ron,
          sell_price_per_g_ron: sell_price_ron ? parseFloat((sell_price_ron / weight_g).toFixed(2)) : null,
          buy_price_per_g_ron: null,
          metal: detectMetal(name)
        };
        
        try {
          const validated = ProductSchema.parse(product);
          results.push(validated);
        } catch (e) {
          console.warn(`Validation failed for BCR product ${sku}`, e);
        }
      }

      const monedeMap = [
        { regex: /1\/10 Uncie.*?mm3\.121([\d,]+)/, name: 'Moneda aur Vienna Philharmonic 1/10 oz', weight: 3.11, sku: 'bcr-moneda-1-10oz' },
        { regex: /1\/4 Uncie.*?mm7\.776([\d,]+)/, name: 'Moneda aur Vienna Philharmonic 1/4 oz', weight: 7.78, sku: 'bcr-moneda-1-4oz' },
        { regex: /1\/2 Uncie.*?mm15\.552([\d,]+)/, name: 'Moneda aur Vienna Philharmonic 1/2 oz', weight: 15.55, sku: 'bcr-moneda-1-2oz' },
        { regex: /1 Uncie.*?mm31\.103([\d,]+)/, name: 'Moneda aur Vienna Philharmonic 1 oz', weight: 31.103, sku: 'bcr-moneda-1oz' },
        { regex: /Ducat Aur 1Au.*?mm3\.49([\d,]+)/, name: 'Moneda aur Ducat 1', weight: 3.49, sku: 'bcr-ducat-1' },
        { regex: /Ducat Aur 4Au.*?mm13\.96([\d,]+)/, name: 'Moneda aur Ducat 4', weight: 13.96, sku: 'bcr-ducat-4' },
      ];

      for (const m of monedeMap) {
        const result = m.regex.exec(text);
        if (result) {
          const priceStr = result[1].replace(/,/g, '');
          const sell_price_ron = parseFloat(priceStr);
          
          const product = {
            provider: this.providerName,
            sku: m.sku,
            name: m.name,
            url: url,
            weight_g: m.weight,
            stock_status: 'In Stock',
            buy_price_ron: null,
            sell_price_ron: sell_price_ron,
            sell_price_per_g_ron: sell_price_ron ? parseFloat((sell_price_ron / m.weight).toFixed(2)) : null,
            buy_price_per_g_ron: null,
            metal: detectMetal(m.name)
          };
          
          try {
            const validated = ProductSchema.parse(product);
            results.push(validated);
          } catch (e) {
            console.warn(`Validation failed for BCR product ${m.sku}`, e);
          }
        }
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error scraping BCR:`, message);
    }

    return results;
  }
}
