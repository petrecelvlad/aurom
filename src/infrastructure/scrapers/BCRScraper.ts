/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": [
 *     "Implements the IScraperStrategy port",
 *     "Sources from a daily PDF (Cotatii_Aur.pdf), not HTML — parses via unpdf (Workers-compatible, PDF.js-based) and fixed regex per product",
 *     "Regexes tolerate whitespace between labels and numbers (\\s*) — unpdf's text extraction spaces tokens differently than pdf-parse did"
 *   ],
 *   "agent_instructions": "This is the BCR bank gold-rate scraper adapter. If BCR changes the PDF layout, the fixed regex table for lingouri/monede will silently stop matching and return 0 products — check text extraction manually before assuming a code bug."
 * }
 */

import { extractText, getDocumentProxy } from 'unpdf';
import { IScraperStrategy } from '../../domain/IScraperStrategy';
import { StandardizedProduct, ProductSchema, detectMetal } from '../../domain/Product';
import { fetchWithTimeout } from './httpClient';

export class BCRScraper implements IScraperStrategy {
  get providerName(): string {
    return 'BCR';
  }

  async scrape(): Promise<StandardizedProduct[]> {
    const url = 'https://www.bcr.ro/content/dam/ro/bcr/www_bcr_ro/Aur/Cotatii_Aur.pdf';
    const results: StandardizedProduct[] = [];

    try {
      console.log(`Scraping BCR PDF: ${url}`);
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        console.error(`Error scraping BCR: HTTP ${response.status}`);
        return results;
      }
      const buffer = await response.arrayBuffer();
      const pdfDoc = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdfDoc, { mergePages: true });

      const lingouriRe = /(\d+)g bar.*?Good Delivery\s*\1\s*([\d,]+)/g;
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
        { regex: /1\/10 Uncie.*?mm\s*3\.121\s*([\d,]+)/, name: 'Moneda aur Vienna Philharmonic 1/10 oz', weight: 3.11, sku: 'bcr-moneda-1-10oz' },
        { regex: /1\/4 Uncie.*?mm\s*7\.776\s*([\d,]+)/, name: 'Moneda aur Vienna Philharmonic 1/4 oz', weight: 7.78, sku: 'bcr-moneda-1-4oz' },
        { regex: /1\/2 Uncie.*?mm\s*15\.552\s*([\d,]+)/, name: 'Moneda aur Vienna Philharmonic 1/2 oz', weight: 15.55, sku: 'bcr-moneda-1-2oz' },
        { regex: /1 Uncie.*?mm\s*31\.103\s*([\d,]+)/, name: 'Moneda aur Vienna Philharmonic 1 oz', weight: 31.103, sku: 'bcr-moneda-1oz' },
        { regex: /Ducat Aur 1\s*Au.*?mm\s*3\.49\s*([\d,]+)/, name: 'Moneda aur Ducat 1', weight: 3.49, sku: 'bcr-ducat-1' },
        { regex: /Ducat Aur 4\s*Au.*?mm\s*13\.96\s*([\d,]+)/, name: 'Moneda aur Ducat 4', weight: 13.96, sku: 'bcr-ducat-4' },
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
