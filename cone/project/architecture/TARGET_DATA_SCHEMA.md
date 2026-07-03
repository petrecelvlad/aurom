# Product Data Schema Guidelines

This document outlines the standard schema (`StandardizedProduct`) required for all scrapers and parsers integrating into the Aurum Precious Metals Aggregator. 

When creating a new parser for a different provider, the extracted data **MUST** strictly conform to this schema. This allows the system to aggregate, compare, and calculate metrics universally across any number of sellers.

## Standardized Product Schema

The schema is defined using Zod for strict runtime validation. All fields must follow these types and formatting rules.

```typescript
{
  provider: string;               // The name of the seller/provider (e.g., "Tavex")
  sku: string;                    // The unique identifier/SKU from the provider
  name: string;                   // The full name/title of the product
  url: string;                    // The full URL linking directly to the product page
  weight_g: number | null;        // The extracted weight of the precious metal in grams (crucial for calculations)
  stock_status: string;           // Standardized stock availability (e.g., "In Stock", "Out of Stock", "Unknown")
  buy_price_ron: number | null;   // The price the provider pays to BUY the product from a customer (in RON)
  sell_price_ron: number | null;  // The price the provider charges to SELL the product to a customer (in RON)
  sell_price_per_g_ron: number | null; // Calculated: sell_price_ron / weight_g
  buy_price_per_g_ron: number | null;  // Calculated: buy_price_ron / weight_g
}
```

## Field Extraction Guidelines

When researching other sellers to build new parsers, ensure you locate the necessary HTML selectors, JSON-LD schemas, or API endpoints to populate these fields.

### `provider`
- **Type**: `string`
- **Description**: A hardcoded string representing the name of the provider you are scraping (e.g., `"Tavex"`, `"BCR"`, etc.).

### `sku`
- **Type**: `string`
- **Description**: The unique product identifier on the provider's platform.
- **Where to find**: Often located in data attributes (e.g., `data-id`, `data-sku`), JSON-LD product schema, or hidden input fields.

### `name`
- **Type**: `string`
- **Description**: The human-readable name of the product.
- **Where to find**: Usually the `<h1>` on the product page or the title in the product grid card.

### `url`
- **Type**: `string`
- **Description**: Absolute URL leading to the product's detail page.
- **Where to find**: The `href` of the product card link. If relative, prepend the provider's base domain.

### `weight_g` (Crucial)
- **Type**: `number | null`
- **Description**: The absolute weight of the product in **grams**. This is critical for our price-per-gram calculator.
- **Where to find**:
  - Check for `application/ld+json` script tags (Schema.org metadata).
  - Look for product specification tables (`<table>`, `<ul>`, `<dl>`).
  - Regex on the product title if weight is consistently formatted (e.g., `"1 oz"`, `"100g"`).
- **Unit Conversion Required**: You must convert other units to grams before saving.
  - `1 oz` (Troy Ounce) = `31.1034768` grams
  - `1 kg` = `1000` grams

### `stock_status`
- **Type**: `string`
- **Description**: The availability of the product.
- **Requirement**: Must be standardized to generic English terms by the parser, regardless of the provider's native language.
  - E.g., Map "În stoc", "Available", "In stoc" -> `"In Stock"`
  - E.g., Map "Stoc epuizat", "Sold out" -> `"Out of Stock"`
  - Default -> `"Unknown"`

### `buy_price_ron` & `sell_price_ron`
- **Type**: `number | null`
- **Description**: The absolute price values in Romanian Leu (RON).
- **Where to find**: Check `data-price` attributes, API responses, JSON-LD, or parse the text of price elements (removing currency symbols and handling commas/dots correctly).

### `buy_price_per_g_ron` & `sell_price_per_g_ron`
- **Type**: `number | null`
- **Description**: The calculated metric showing the price per gram.
- **Calculation**: Divide the `buy_price_ron` (or `sell_price_ron`) by the `weight_g`. Round to 2 decimal places if needed.

## Example JSON Output

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
