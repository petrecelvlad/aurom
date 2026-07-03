# TavexScraper Implementation

## 1. Overview
The `TavexScraper` class implements the `IScraperStrategy` interface to extract precious metal products from **Tavex Romania** (`tavex.ro`). It is the most robust scraper in the ecosystem due to its hybrid approach.

## 2. Target & Methodology
*   **Methodology**: Hybrid HTML DOM Parsing + JSON-LD Extraction + Embedded JSON Parsing.
*   **Library**: `axios` + `cheerio`.
*   **Target Endpoints**: Main category grids.
    *   `https://tavex.ro/aur/`
    *   `https://tavex.ro/argint/`

## 3. Extraction Logic

Tavex relies heavily on structured data schemas injected into the DOM, allowing the scraper to bypass brittle text-regex operations for critical data.

### Step 1: Preloading Schema Data
Before looping through HTML elements, the scraper hunts for `<script type="application/ld+json">`.
*   It parses the `CollectionPage` schema.
*   It extracts the `itemListElement` array and builds an internal `Map` (`schemaItems`) keyed by the product's SKU.
*   This map cleanly resolves the absolute URL, full un-truncated name, and strict mathematical weight directly from the backend data.

### Step 2: DOM Traversal
*   **Product Container**: `.js-product:not(.product--listing)`.
*   **SKU**: `$('.actions__button').attr('data-id')`.

### Step 3: Merging Data
For each product container, it retrieves the corresponding Schema data using the SKU.
*   **Title & URL**: Taken from `schemaData` if available, otherwise falls back to basic DOM extraction.
*   **Weight**: Prioritizes `schemaData.weight.value` and `schemaData.weight.unitCode`. Safely multiplies by 1000 for `kg` or 31.1034768 for `oz`. Bypasses regex title parsing almost entirely.

### Price Extraction (Embedded JSON)
Tavex injects a `data-pricelist` attribute onto `.js-product-price-from` containing raw JSON data for their live pricing ticker.
*   The scraper reads this attribute, parses it via `JSON.parse()`.
*   **Sell Price**: Safely extracted from `priceData.sell[0].price`.
*   **Buy Price**: Safely extracted from `priceData.buy[0].price`.
*   *Result*: 100% accuracy, bypassing all currency stripping, DOM hierarchy issues, and strikethrough logic.

### Stock Status
Extracts text from `.product__stock` and checks for the string "stoc epuizat" (Out of stock). Defaults to "In Stock".

## 4. Error Handling
*   Gracefully falls back to DOM regex if the `application/ld+json` script tag is missing or malformed.
*   Standard Zod schema validation protects the output.
