# Provider Scraping Specifications & Implementations

This document catalogs the exact extraction mechanisms, endpoints, API interfaces, and TypeScript implementations for every supported precious metal provider, alongside the core scraping infrastructure.

---

## 1. Aurom Investment (`AuromScraper.ts`)

**Class:** `AuromScraper` implements `IScraperStrategy`
**Target URLs:** `https://aurominvestment.ro/shop/page/{page}/` (1 to 10 pages).
**Library:** `fetch` (Workers-native, via `fetchWithTimeout`) + `cheerio` (HTML DOM Parsing)
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
*   **Price Extraction:**
    *   Finds `.price .amount` and takes the `.last()` element (assuming the last element is the current selling price, skipping strikethrough sale prices).
    *   Text is passed to the centralized `PriceParser.parseRonPrice` (see [UNIFIED_SCRAPER_SCHEMA.md](./UNIFIED_SCRAPER_SCHEMA.md)) — not parsed locally.
    *   **Buy Price:** Always `null`. Aurom does not expose this.
*   **Stock Status:** Checks if `product.attr('class')` includes `outofstock` or `out-of-stock`. Defaults to `In Stock`.

---

## 2. Avangard Gold (`AvangardScraper.ts`)

**Class:** `AvangardScraper` implements `IScraperStrategy`
**Target URLs:** `https://avangardgold.ro/products.json?limit=250` (Shopify JSON API)
**Library:** `fetch` (Workers-native, via `fetchWithTimeout`)
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
**Library:** `fetch` (Workers-native, via `fetchWithTimeout`) + `cheerio`
**Timeout:** 15,000ms

### Implementation Details:
*   **Target Selectors:** Primarily relies on `.product-loop`, falling back to `.product-wrap, li.product, div.product`. (Note: The fallback can cause nested duplicate scrapes).
*   **SKU Logic:** Looks for `data-product-id` or `data-product_id` directly on the container or inside children. Falls back to a slugified name string.
*   **Stock Status:** Checks classes for `outofstock`, `out-of-stock`, and aggressively checks the raw `.text()` of the product for "stoc epuizat", "epuizat", or "out of stock".
*   **Weight Extraction (`extractWeightInGrams`):** Identical Regex patterns as Aurom.

*   **Price Extraction:** Locates `span.price > div` blocks, matching "Vindem" (Sell) / "Cumpăram" (Buy) label text to their sibling `.amount bdi` price text. Falls back to the first `.price .amount bdi` found if no labels match. Extracted text is passed to the centralized `PriceParser.parseRonPrice` (see [UNIFIED_SCRAPER_SCHEMA.md](./UNIFIED_SCRAPER_SCHEMA.md)) — not parsed locally.

### 🛑 Neogold Autopsy (Known Fragility):
1.  **Sibling vs. Parent-Child DOM Traversal:** The label-matching depends on the price living inside the same container element as the label text. If a future layout change renders the label and price as fully disjoint siblings, the label match can miss the price.
2.  **Fallback Ambiguity:** When specific labels fail to match, the fallback selects the *first* price on the card. If the "Buy" price is visually rendered first in a future layout, it would be misread as "Sell".

---

## 4. Tavex (`TavexScraper.ts`)

**Class:** `TavexScraper` implements `IScraperStrategy`
**Target URLs:** `https://tavex.ro/aur/` and `https://tavex.ro/argint/`
**Library:** `fetch` (Workers-native, via `fetchWithTimeout`) + `cheerio` (Hybrid HTML & JSON-LD parsing)
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

## 5. BCR (`BCRScraper.ts`)

**Class:** `BCRScraper` implements `IScraperStrategy`
**Target URL:** `https://www.bcr.ro/content/dam/ro/bcr/www_bcr_ro/Aur/Cotatii_Aur.pdf` (a daily PDF, not HTML)
**Library:** `fetch` (Workers-native, via `fetchWithTimeout`) + `unpdf` (PDF.js-based, Workers-compatible text extraction)
**Timeout:** 15,000ms

### Implementation Details:
*   **No pagination, no DOM.** The entire product list comes from regex-matching a fixed set of known products against the PDF's extracted plain text — there is no generic parsing here, every product is a hand-written pattern.
*   **Lingouri (bars):** `/(\d+)g bar.*?Good Delivery\s*\1\s*([\d,]+)/g` matches every `{weight}g bar ... Good Delivery {weight} {price}` occurrence in one pass.
*   **Monede (coins) + Ducats:** A fixed table of 6 patterns, one per known denomination (1/10, 1/4, 1/2, 1 oz Vienna Philharmonic; Ducat 1; Ducat 4), each matching on a unique substring (`mm` + a specific millimeter/gram marker) followed by the price.
*   **Regexes use `\s*` around the number groups** — `unpdf`'s text extraction spaces tokens differently than the previous `pdf-parse` library did (e.g. `"Good Delivery 2 1,519"` with spaces, not `"Good Delivery21,519"`). If BCR changes the PDF layout, or the text-extraction library changes again, re-verify every pattern against the live PDF text before assuming the regressions are a code bug elsewhere.
*   **Price parsing:** Simple `.replace(/,/g, '')` then `parseFloat` — this PDF uses thousands-comma with no decimal fraction, a different convention from the Romanian web price text `PriceParser.parseRonPrice` handles, so it is intentionally not routed through that shared parser.
*   **Buy Price:** Always `null` for lingouri/monede sale offers (BCR does publish a lingouri buy-back price in the PDF, but it isn't parsed by this scraper today).

---

## 6. Persistence: `D1ProductRepository.ts` / `D1BenchmarkRepository.ts`

**Classes:** implement `IProductRepository` / `IBenchmarkRepository` against Cloudflare D1
**Called from:** `src/worker.ts` — `saveSnapshot()` from `POST /api/ingest` (write, triggered by `scripts/scrapeAndIngest.ts` via GitHub Actions roughly every 5 minutes), `getAll()` / `getLatest()` once per HTTP request (read-only)

### Implementation Details:
*   **`products` / `benchmark`:** Upserted every tick (`INSERT ... ON CONFLICT DO UPDATE`), keyed by `(provider, sku)` and `source` respectively. This *is* the cache now — there is no in-memory or per-request caching layer, because the fetch handler never scrapes; it only ever reads this table.
*   **`price_history` / `benchmark_history`:** Append-only, but a row is written **only when the price actually changed** since the last tick (compared against the prior snapshot before the upsert). A naive "insert one history row per tick" would write ~200 rows × 1440 ticks/day for data that mostly doesn't move — the change-check keeps this proportional to actual price movement instead.
*   **Batching:** `saveSnapshot()` chunks D1 `.batch()` calls to stay comfortably under D1's per-batch statement limit.
