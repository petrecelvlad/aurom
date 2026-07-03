import { StandardizedProduct } from './Product';

export interface IScraperStrategy {
  get providerName(): string;
  scrape(): Promise<StandardizedProduct[]>;
}
