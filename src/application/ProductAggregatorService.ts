/**
 * @propolis
 * {
 *   "role": "SERVICE",
 *   "constraints": [
 *     "Performs centralized post-processing and price-per-fine-gram calculation",
 *     "Aggregates from all registered IScraperStrategy port adapters in parallel using Promise.allSettled"
 *   ],
 *   "agent_instructions": "This service handles coordination and normalization. Ensure that fineWeightG is never modified manually inside scrapers, as it is post-processed here via PurityEstimator."
 * }
 */

import { IScraperStrategy } from '../domain/IScraperStrategy';
import { StandardizedProduct } from '../domain/Product';
import { PurityEstimator } from '../domain/PurityEstimator';

export class ProductAggregatorService {
  private scrapers: IScraperStrategy[] = [];

  registerScraper(scraper: IScraperStrategy) {
    this.scrapers.push(scraper);
  }

  async aggregateAll(): Promise<StandardizedProduct[]> {
    const allResults = await Promise.allSettled(
      this.scrapers.map(scraper => scraper.scrape())
    );

    const products: StandardizedProduct[] = [];
    
    for (const result of allResults) {
      if (result.status === 'fulfilled') {
        products.push(...result.value);
      } else {
        console.error('A scraper failed:', result.reason);
      }
    }

    // Centralized post-processing to estimate purity and compute fine metal weights
    return products.map(product => {
      if (product.weight_g !== null && product.weight_g > 0) {
        const purityInfo = PurityEstimator.estimate(product.name, product.weight_g, product.metal);
        
        // Recalculate price per gram based on pure gold/metal weight (fine_weight_g)
        const fineWeight = purityInfo.fineWeightG || product.weight_g;
        const sell_price_per_g_ron = product.sell_price_ron 
          ? parseFloat((product.sell_price_ron / fineWeight).toFixed(2)) 
          : null;
        const buy_price_per_g_ron = product.buy_price_ron 
          ? parseFloat((product.buy_price_ron / fineWeight).toFixed(2)) 
          : null;

        return {
          ...product,
          purity: purityInfo.purity,
          karats: purityInfo.karats,
          fine_weight_g: fineWeight,
          sell_price_per_g_ron,
          buy_price_per_g_ron,
        };
      }
      return product;
    });
  }
}
