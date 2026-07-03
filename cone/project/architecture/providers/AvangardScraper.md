# AvangardScraper Implementation

## 1. Overview
The `AvangardScraper` class implements the `IScraperStrategy` interface to extract precious metal products from **Avangard Gold** (`avangardgold.ro`).

## 2. Target & Methodology
*   **Methodology**: Direct JSON API Parsing.
*   **Library**: `axios`.
*   **Target Endpoints**: Shopify public JSON feeds.
    *   `https://avangardgold.ro/products.json?limit=250`
*   **Pagination Limit**: Currently hardcoded to a single request with a limit of 250 products (bypassing traditional multi-page loops).

## 3. Extraction Logic

Because Avangard uses Shopify, the scraper bypasses Cheerio HTML parsing entirely and directly processes structured Javascript Objects.

### Iteration Model
A single Shopify `product` can contain multiple `variants` (e.g., different weights or conditions). The scraper iterates through `response.data.products` and then performs a nested loop through `product.variants`.

### Data Mapping
*   **SKU**: Uses `variant.sku`. Falls back to `avangard-${product.id}-${variant.id}`.
*   **Title**: If the variant title is "Default Title", it uses `product.title`. Otherwise, it concatenates them: `${product.title} (${variant.title})`.
*   **URL**: Constructed manually as `https://avangardgold.ro/products/${product.handle}`.

### Price Extraction
Avangard does not publish Buy-back prices via the Shopify API. Buy prices are always `null`.
*   **Sell Price**: Read directly from the float property `variant.price`.

### Weight Extraction
Structured weight data is prioritized over title regex parsing.
1.  **Variant Weight Property**: Checks `variant.weight` and `variant.weight_unit`.
    *   If unit is `kg`, multiplies by `1000`.
    *   If unit is `oz` or `onza`, multiplies by `31.1034768`.
2.  **Variant Grams Property**: Falls back to `variant.grams` if available.
3.  **Title Fallback (`extractWeightInGrams`)**: If the API fails to provide a valid weight, it falls back to the standard regex `oz`/`kg`/`g` title parsing.

### Stock Status
Determined by Shopify inventory rules. Considered out of stock if:
*   `variant.available === false`
*   OR (`variant.inventory_quantity <= 0` AND `variant.inventory_policy === 'deny'`)

## 4. Error Handling
*   Standard Zod schema validation applied at the end.
*   Skips accessories by failing the metal detection (`detectMetal(title)`).
