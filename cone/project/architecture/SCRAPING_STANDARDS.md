# Scraping Standards & Architecture

This document dictates the rules of engagement, architecture constraints, and error handling protocols for the precious metal scraping pipeline.

## 1. Interface Contract

All current and future scrapers **MUST** implement the exact `IScraperStrategy` interface:

```typescript
import { StandardizedProduct } from '../../domain/Product';

export interface IScraperStrategy {
  get providerName(): string;
  scrape(): Promise<StandardizedProduct[]>;
}
```

*   **No custom return types:** A scraper must map its proprietary extraction results exclusively into the `StandardizedProduct` array using Zod validation.
*   **No state mutations:** Scrapers must remain stateless and return fresh data on every invocation.

## 2. Error Handling Rules

1.  **Never Crash the Job:** A failure to parse a single product or a single page MUST NOT crash the entire scraping process for that provider. Use localized `try-catch` blocks within iteration loops.
2.  **Graceful Pagination:** If a scraper encounters a `404 Not Found` or a page with 0 products during pagination, it should gracefully terminate the loop and return the accumulated products.
3.  **Strict Validation:** The parsed data must be passed through `ProductSchema.safeParse()`. If validation fails, the product must be dropped. Do not attempt to force invalid data into the final payload.
4.  **Resilient DOM Selection:** Avoid highly specific descendant selectors (e.g., `div > ul > li:nth-child(2) > span`). Use semantic classes or data attributes where available.

## 3. Data Integrity & Rejection Policies

A product **MUST** be dropped/skipped from the final dataset if any of the following are true:
*   The `metal` type cannot be identified.
*   The `weight_g` cannot be identified or calculated to a value `> 0`.
*   It is an accessory (e.g., boxes, capsules, display cases), determined by the absence of precious metal keywords.

A product **MAY** be kept, even if:
*   `buy_price_ron` is `null` (providers often omit buy-back rates online).
*   `sell_price_ron` is `null` (this occurs for out-of-stock items, though it should be handled gracefully).

## 4. Logging Standards

To maintain observability in the extraction pipeline, scrapers must adhere to the following logging guidelines:

*   **Action Intention:** Log the target URL before making an HTTP request (e.g., `Scraping [Provider] category: [URL]`).
*   **Pagination Progress:** Log completion of pages including the number of valid items retrieved (e.g., `Page 1 parsed: found 20 products, added 15 weighted items.`).
*   **Data Validation Warnings:** If a product fails Zod schema validation, it must trigger a warning with the exact validation error (e.g., `console.warn('Skipping invalid product data for [Provider]:', parsedData.error);`).
*   **HTTP Errors:** Log network-level errors cleanly. If it is an expected failure state (like a 404 at the end of pagination), handle it silently or log it as `info` rather than a fatal `error`.
