# NeogoldScraper Implementation

## 1. Overview
The `NeogoldScraper` class implements the `IScraperStrategy` interface to extract precious metal products from **Neogold** (`neogold.ro`). It handles the specific quirks of their custom WooCommerce implementation by using text-footprint parsing for prices.

## 2. Target & Methodology
*   **Methodology**: HTML DOM Parsing + Full Text Regex Parsing.
*   **Library**: `axios` + `cheerio`.
*   **Target Endpoints**: WooCommerce category pages.
    *   `/categorie-produs/lingouri-aur/`
    *   `/categorie-produs/monede-aur/`
    *   `/categorie-produs/lingouri-argint/`
    *   `/categorie-produs/monede-argint/`

## 3. Extraction Logic

### DOM Selectors
*   **Product Container**: First tries `div.product, .product-wrap, .product-body`. Falls back to `.product-loop, li.product`.
*   **SKU**: Checks `data-id`, `data-product-id` or `data-product_id`. Falls back to a deterministic slugified name `neogold-${nameLower.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}`.
*   **Title**: `.product-title a, .woocommerce-loop-product__title, h2, h3`.
*   **URL**: Extracted from the `href` of the matched title element, falling back to a generic `a` tag in the container.
*   **Weight**: Inferred strictly from regex on the Title (using the same core logic as Aurom).

### Price Extraction (Text Footprint Parsing)
Neogold's DOM layout is highly irregular, often placing labels like "Vindem:" and "Cumpăram:" as siblings or loose text nodes rather than strict parent-child hierarchies.
*   **The Fix**: Instead of relying on brittle `.find()` DOM traversals, the scraper captures the full text footprint of the product container (`product.text()`).
*   **Regex Extraction**: It runs specific Regex matches directly on the raw text:
    *   **Sell Price:** `/Vindem:\s*([\d.,]+)\s*lei/i`
    *   **Buy Price:** `/Cumpăra[mș]:\s*([\d.,]+)\s*lei/i` (Handles diacritics like `Cumpăraș` or `Cumpăram`).
*   **Formatting**: Cleans the matched string by removing dot separators (thousands) and converting decimal commas to dots before parsing as float.

### Stock Status
*   Evaluates the combined raw text and class list of the card container.
*   Marks as "Out of Stock" if it finds `out of stock`, `epuizat`, `stoc epuizat`, or the `outofstock` class.

## 4. Error Handling
*   Gracefully skips items with missing titles, URLs, weights, or unidentified metals without failing the loop.
*   Relies on robust Zod schema validation to guarantee the structural integrity of the final array.
