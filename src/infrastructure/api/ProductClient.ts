import { StandardizedProduct } from '../../types';

export class ProductClient {
  async fetchAllProducts(): Promise<StandardizedProduct[]> {
    const response = await fetch('/api/scrape/all');
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.detail || 'Failed to fetch data');
    }

    return result.data || [];
  }
}
