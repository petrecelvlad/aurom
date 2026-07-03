# Provider Scraping Specifications & Implementations

This document catalogs the exact extraction mechanisms, endpoints, API interfaces, and TypeScript implementations for every supported precious metal provider, alongside the core scraping infrastructure.

---

## 1. Aurom Investment (`AuromScraper.ts`)

**Class:** `AuromScraper` implements `IScraperStrategy`
**Target URLs:** `https://aurominvestment.ro/shop/page/{page}/` (1 to 10 pages).
**Library:** `axios` + `cheerio` (HTML DOM Parsing)
**Timeout:** 15,000ms

### Implementation Details:
*   **Pagination Logic:** A `for` loop iterates from page 1 to 10. If an HTTP 404 is encountered, or `$('li.product')` returns 0 elements, the pagination breaks early.
*   **Metal Identification:** Uses the global `detectMetal(name, link)` to check for gold/silver/platinum/palladium. Drops non-precious metals automatically.
*   **Weight Extraction (`extractWeightInGrams`):**
    *   Regex parsing on the `nameLower` string.
    *   **Oz:** Matches `/(\d+(?:\.\d+)?)\s*oz\b/` -> Multiplies by `31.1034768`.
    *   **Kg:** Matches `/(\d+(?:\.\d+)?)\s*kg\b/` -> Multiplies by `1000.0`.
    *   **Grams:** Matches `/(\d+(?:\.\d+)?)\s*(?:g|gr|gram|grame)\b/`.
*   **SKU Logic:** Uses `data-product_id` attribute. If missing, it uses `aurom-{slugified_name}`.
*   **Price Extraction (`cleanRomanianPrice`):**
    *   Finds `.price .amount` and takes the `.last()` element (assuming the last element is the current selling price, skipping strikethrough sale prices).
    *   Strips `lei`, `ron`, keeps only `\d.,`.
    *   Handles Romanian formatting: Replaces `,` with `.` if it's acting as a decimal (e.g., `550,50` -> `550.50`). Checks if `.` is a thousands separator by checking trailing digits count.
    *   **Buy Price:** Always `null`. Aurom does not expose this.
*   **Stock Status:** Checks if `product.attr('class')` includes `outofstock` or `out-of-stock`. Defaults to `In Stock`.

---

## 2. Avangard Gold (`AvangardScraper.ts`)

**Class:** `AvangardScraper` implements `IScraperStrategy`
**Target URLs:** `https://avangardgold.ro/products.json?limit=250` (Shopify JSON API)
**Library:** `axios` (JSON Parsing)
**Timeout:** 15,000ms

### Implementation Details:
*   **Data Sourcing:** Directly requests the Shopify unauthenticated `/products.json` endpoint, completely bypassing HTML scraping.
*   **Variant Iteration:** 
    *   Loops through `response.data.products`.
    *   Loops through each `product.variants` array (essential since weight and price differ by variant).
*   **Name Construction:** If the variant title is `Default Title`, it uses `product.title`. Otherwise, it constructs `${product.title} (${variantTitle})`.
*   **Weight Extraction:**
    1.  First attempts to read `variant.weight` and `variant.weight_unit` (falling back to unit `g`).
    2.  Converts `kg` -> `* 1000`, `oz`/`onza` -> `* 31.1034768`.
    3.  If missing, tries `variant.grams`.
    4.  If still missing, falls back to Regex on the constructed Title.
*   **SKU Logic:** `variant.sku`, falling back to `avangard-{product.id}-{variant.id}`.
*   **Price Extraction:**
    *   **Sell Price:** Extracts `variant.price` directly as a float.
    *   **Buy Price:** Always `null` (Shopify API doesn't store this custom metadata).
*   **Stock Status:** Checks `variant.available === false` OR if `inventory_quantity <= 0` combined with `inventory_policy === 'deny'`.

---

## 3. Neogold (`NeogoldScraper.ts`)

**Class:** `NeogoldScraper` implements `IScraperStrategy`
**Target URLs:** WooCommerce category pages (`/lingouri-aur/`, `/monede-aur/`, `/lingouri-argint/`, `/monede-argint/`)
**Library:** `axios` + `cheerio`
**Timeout:** 15,000ms

### Implementation Details:
*   **Target Selectors:** Primarily relies on `.product-loop`, falling back to `.product-wrap, li.product, div.product`. (Note: The fallback can cause nested duplicate scrapes).
*   **SKU Logic:** Looks for `data-product-id` or `data-product_id` directly on the container or inside children. Falls back to a slugified name string.
*   **Stock Status:** Checks classes for `outofstock`, `out-of-stock`, and aggressively checks the raw `.text()` of the product for "stoc epuizat", "epuizat", or "out of stock".
*   **Weight Extraction (`extractWeightInGrams`):** Identical Regex patterns as Aurom.

### 🛑 Neogold Autopsy (Critical Failure Analysis):
The scraper suffers from severe bugs in its `extractPricesFromNeogold` method:
1.  **Sibling vs. Parent-Child DOM Traversal Bug:** The code attempts to match elements containing the text "Vindem" (Sell) or "Cumpăram" (Buy), and then runs `$(el).find('.amount')` to get the price. If the layout renders the label and the price as siblings (e.g. `<span>Vindem</span> <span class="amount">100</span>`), `.find()` yields nothing.
2.  **Dangerous Price Fallback Logic:** When the specific labels fail to match, the fallback simply selects the *first* price (`amountElements.first().text()`). If the "Buy" price is visually rendered first, it is logged as the "Sell" price.
3.  **Discount/Strikethrough Confusion:** The fallback looks for `<ins>` tags but fails to robustly distinguish between `<del>` (old price) and the actual selling price when elements are deeply nested.

---

## 4. Tavex (`TavexScraper.ts`)

**Class:** `TavexScraper` implements `IScraperStrategy`
**Target URLs:** `https://tavex.ro/aur/` and `https://tavex.ro/argint/`
**Library:** `axios` + `cheerio` (Hybrid HTML & JSON-LD parsing)
**Timeout:** 15,000ms

### Implementation Details:
*   **JSON-LD Data Preloading:** 
    *   Before parsing the DOM elements, the scraper finds all `<script type="application/ld+json">` tags.
    *   It parses `CollectionPage` schema markup and caches the `itemListElement` array in a `schemaItems` Map, indexed by SKU.
*   **DOM Traversal:** Selects products using `.js-product:not(.product--listing)`.
*   **Data Merging:**
    *   **SKU:** Retrieved from the `.actions__button[data-id]` attribute.
    *   **Name & URL:** Extracted from DOM, falling back to the `schemaData`.
    *   **Weight:** Prefers `schemaData.weight.value` and `schemaData.weight.unitCode` (handling `kg` and `oz` conversions), bypassing regex entirely.
*   **Price Extraction:**
    *   Relies on a highly structured custom data attribute: `.js-product-price-from[data-pricelist]`.
    *   Parses the attribute as JSON.
    *   **Sell Price:** Extracts from `priceData.sell[0].price`.
    *   **Buy Price:** Extracts from `priceData.buy[0].price`.
*   **Stock Status:** Simple lowercase text matching on `.product__stock` for "stoc epuizat" or "în stoc".

---

## 5. Infrastructure: `CachingScraperDecorator.ts`

**Class:** `CachingScraperDecorator` implements `IScraperStrategy`
**Design Pattern:** Decorator Pattern (Wrapper)

### Implementation Details:
*   **Purpose:** Wraps any existing `IScraperStrategy` to prevent aggressive rate-limiting and reduce HTTP calls.
*   **Mechanism:** 
    *   Maintains an internal array `cache: StandardizedProduct[] | null`.
    *   Tracks `lastFetchTime`.
    *   Default `cacheDurationMinutes` is 5 minutes.
*   **Logic Flow:**
    *   On `scrape()`, calculates `Date.now() - this.lastFetchTime`.
    *   If it is under the `cacheDurationMs` threshold, it immediately resolves the cached array.
    *   If a cache miss occurs, it `await`s the inner scraper, updates `lastFetchTime`, caches the result, and returns it.
*   **Transparency:** Proxies the `providerName` getter down to the underlying instance seamlessly.
