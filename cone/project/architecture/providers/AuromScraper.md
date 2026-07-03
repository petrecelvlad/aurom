# AuromScraper Implementation

## 1. Overview
The `AuromScraper` class implements the `IScraperStrategy` interface to extract precious metal products from **Aurom Investment** (`aurominvestment.ro`).

## 2. Target & Methodology
*   **Methodology**: HTML DOM Parsing.
*   **Library**: `axios` for HTTP requests, `cheerio` for DOM traversal.
*   **Target Endpoints**: WooCommerce paginated shop listings.
    *   `https://aurominvestment.ro/shop/page/{page}/`
*   **Pagination Limit**: Hardcoded to iterate from page 1 up to page 10. It breaks early if a `404 Not Found` is caught or if the product container count is zero.

## 3. Extraction Logic

### DOM Selectors
*   **Product Container**: `li.product`
*   **SKU**: Reads the `data-product_id` attribute on the container. Falls back to a slugified name (`aurom-${nameLower.replace(/\s+/g, '-')}`).
*   **Title**: `.woocommerce-loop-product__title` (fallback to `h2`).
*   **URL**: `.woocommerce-LoopProduct-link` (fallback to `a` tag `href`).

### Price Extraction (`cleanRomanianPrice`)
Aurom only lists the **Sell Price**. Buy prices are returned as `null`.
*   **Selector**: `.price .amount`
*   **Strikethrough Logic**: Uses `.last()` on the matched amount elements to bypass sale strikethroughs and grab the current active price.
*   **Normalization**: 
    1. Strips currency strings (`lei`, `ron`, whitespace).
    2. Detects Romanian locale formats (e.g., `1.500,50`). If a comma is used for decimals, it translates it to standard floating point strings.
    3. Parses to `float`.

### Weight Extraction (`extractWeightInGrams`)
Aurom does not provide structured weight data. Weight is exclusively inferred from the title string using Regular Expressions.
1.  **Ounces (oz)**: `/(\d+(?:\.\d+)?)\s*oz\b/` -> Multiplied by `31.1034768`.
2.  **Kilograms (kg)**: `/(\d+(?:\.\d+)?)\s*kg\b/` -> Multiplied by `1000.0`.
3.  **Grams (g)**: `/(\d+(?:\.\d+)?)\s*(?:g|gr|gram|grame)\b/`.

### Metal Detection
Uses the global utility `detectMetal(name, url)` to map titles to `Gold`, `Silver`, `Platinum`, or `Palladium`. If no match is found, the product is dropped.

### Stock Status
Checks if the product container's `class` attribute includes `outofstock` or `out-of-stock`.

## 4. Error Handling
*   Pagination gracefully handles HTTP 404 responses.
*   Missing weights or undetermined metals cause the item to be skipped quietly.
*   The final array is validated against the `ProductSchema` via Zod.
