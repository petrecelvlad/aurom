# CORE_API_CONTRACT.md (The Engine Manual)

## The Core Domain Boundary

This document treats the core business logic (housed in `/src/core/` and backend `/src/services/`) as a formal, internal API. It establishes the strict boundaries and public-facing contracts that adapters (like the Express API) are permitted to interact with.

### I. The Purity Mandate
The Core Domain must be pure. 
*   It must **not** import any specific external libraries related to HTTP requests (like `axios` or `express`) or DOM parsing (like `cheerio` or `jsdom`). 
*   It must **not** know about the React UI.
*   It operates solely on standard TypeScript objects and pure functions.

### II. Domain Entities (The Vocabulary)
The core defines the absolute shape of the data. All layers must translate external data into these entities.

```typescript
// /src/core/entities/MetalPrice.ts

export type MetalType = 'gold' | 'silver' | 'platinum' | 'palladium';

export interface MetalPrice {
  id: string; // Unique identifier for the product
  name: string;
  type: MetalType;
  buyPrice: number | null;
  sellPrice: number | null;
  currency: string;
  weightGrams: number | null;
  url: string;
  timestamp: string; // ISO-8601 UTC
}
```

### III. The Service Port Contracts
External actions (like scraping a website) are defined as Interfaces (Ports) within the core. The core dictates *what* needs to be done, not *how*.

```typescript
// /src/core/ports/ScraperPort.ts

import { MetalPrice } from '../entities/MetalPrice';

export interface ScraperPort {
  /**
   * Scrapes the target source and returns a list of MetalPrice entities.
   * Must throw a structured ScraperError on failure.
   */
  scrapePrices(): Promise<MetalPrice[]>;
}
```

### IV. The Application Services (Use Cases)
The core exposes Use Cases that orchestrate the domain entities and ports. The Express API (Adapter) is only allowed to call these Use Cases.

```typescript
// /src/core/usecases/GetLivePricesUseCase.ts

import { ScraperPort } from '../ports/ScraperPort';
import { MetalPrice } from '../entities/MetalPrice';

export class GetLivePricesUseCase {
  constructor(private readonly scraper: ScraperPort) {}

  public async execute(): Promise<MetalPrice[]> {
    try {
      const rawPrices = await this.scraper.scrapePrices();
      // Core can apply business rules here (e.g., filtering out invalid data, calculating premiums)
      return this.sanitizePrices(rawPrices);
    } catch (error) {
      // Core wraps external errors in domain-specific errors
      throw new Error(`Failed to retrieve live prices: ${error.message}`);
    }
  }
  
  private sanitizePrices(prices: MetalPrice[]): MetalPrice[] {
      return prices.filter(p => p.buyPrice !== null || p.sellPrice !== null);
  }
}
```

### V. Adapter Rules
*   **Express API:** The Express router must instantiate the `GetLivePricesUseCase`, passing in the concrete `TavexScraperAdapter`, execute the use case, and map the returned `MetalPrice[]` to an HTTP JSON response. It must NOT contain scraping logic itself.
*   **Tavex Scraper Adapter:** Implements `ScraperPort`. It is permitted to import `cheerio` and `axios`, fetch the HTML from Tavex.ro, parse it, and map the messy HTML strings into pristine `MetalPrice` objects before returning them to the core.
