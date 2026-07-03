# Unified Scraper Schema

This document defines the absolute source of truth for the `Product` data model used across all precious metal provider scrapers. 

## The `Product` Model

All scrapers must output data that strictly adheres to the `StandardizedProduct` schema, which is validated at runtime using Zod (`ProductSchema`).

### Fields & Data Types

| Field | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `provider` | `string` | No | The name of the precious metal provider (e.g., 'Aurom Investment', 'Avangard Gold', 'Neogold', 'Tavex'). |
| `sku` | `string` | No | A unique identifier scoped to the provider. If a native SKU is absent, it must be deterministically generated (e.g., `provider-slugified-name`). |
| `name` | `string` | No | The raw title or name of the product as listed by the provider. |
| `url` | `string` | No | The absolute URL to the product's detail page. |
| `weight_g` | `number` | Yes | The parsed and normalized weight of the precious metal in grams. |
| `stock_status` | `string` | No | The availability of the item. Must be normalized to values like `'In Stock'`, `'Out of Stock'`, or `'Unknown'`. |
| `buy_price_ron` | `number` | Yes | The price the provider is willing to pay to buy the product back, in RON. |
| `sell_price_ron` | `number` | Yes | The price the provider sells the product for, in RON. |
| `sell_price_per_g_ron` | `number` | Yes | Calculated metric: `sell_price_ron / weight_g`. Rounded to 2 decimal places. |
| `buy_price_per_g_ron` | `number` | Yes | Calculated metric: `buy_price_ron / weight_g`. Rounded to 2 decimal places. |
| `metal` | `enum` | No | The identified precious metal type. Allowed values: `'Gold'`, `'Silver'`, `'Platinum'`, `'Palladium'`. |

## Data Normalization Rules

1.  **Price Normalization:**
    *   All prices MUST be parsed to floating-point numbers representing the Romanian Leu (RON).
    *   Currency symbols (lei, ron) and thousands separators (dots or commas) must be stripped.
    *   Prices must be rounded to exactly 2 decimal places.
2.  **Weight Normalization:**
    *   All weights MUST be converted to metric grams (`g`).
    *   Troy Ounces (`oz`) must be multiplied by exactly `31.1034768`.
    *   Kilograms (`kg`) must be multiplied by `1000`.
    *   The resulting gram weight should be rounded to 3 decimal places.
3.  **Metal Classification:**
    *   The `metal` field must be determined by inspecting both the product name and URL against standardized keyword rules defined in `detectMetal`.
    *   Any product that cannot be classified as one of the four core metals MUST be dropped/ignored.

---

## Field Extraction Guidelines

When building a parser for a new provider, locate the HTML selectors, JSON-LD schemas, or API endpoints needed to populate each field.

*   **`sku`** — Often in data attributes (`data-id`, `data-sku`), JSON-LD product schema, or hidden input fields.
*   **`name`** — Usually the `<h1>` on the product page or the title in the product grid card.
*   **`url`** — The `href` of the product card link. If relative, prepend the provider's base domain.
*   **`weight_g`** — Check `application/ld+json` script tags first, then product spec tables, then regex on the title if formatting is consistent (e.g. `"1 oz"`, `"100g"`).
*   **`stock_status`** — Map native-language terms to the standard three values: `"În stoc"` / `"Available"` / `"In stoc"` → `In Stock`; `"Stoc epuizat"` / `"Sold out"` → `Out of Stock`; anything else → `Unknown`.
*   **`buy_price_ron` / `sell_price_ron`** — Check `data-price` attributes, API responses, JSON-LD, or parse price element text (strip currency symbols, handle comma/dot formatting).

### Example Output

```json
{
  "provider": "Tavex",
  "sku": "118",
  "name": "1 oz Austrian Philharmonic Gold Coin",
  "url": "https://tavex.ro/aur/moneda-de-aur-filarmonica-din-viena-de-1-oz",
  "weight_g": 31.103,
  "stock_status": "In Stock",
  "buy_price_ron": 11520,
  "sell_price_ron": 11985,
  "buy_price_per_g_ron": 370.38,
  "sell_price_per_g_ron": 385.33
}
```
