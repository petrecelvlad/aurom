---
type: Skill
title: "Web Scraping and Parsing Playbook"
description: Procedural playbook for scraping and parsing physical gold/silver listings from Romanian dealer websites.
tags: [skill, scraping, parsing, cheerio]
timestamp: 2026-07-02T00:00:00Z
constraints:
  - All scraper adapters must implement the IScraperStrategy port and fail gracefully
agent_instructions: >
  Consult this skill before creating or editing any scraper adapter under src/infrastructure/scrapers/.
---

# Skill: Web Scraping and Parsing

This skill outlines our procedural playbook for web scraping and parsing bullion listings from Romanian dealer websites.

---

## 1. Scraping Resilience & Standards

### Cheerio Usage
We use `cheerio` to parse scraped HTML responses on our Express backend.
*   **Selector Guarding**: Always wrap selector extraction in safe check structures (e.g., check for nulls or undefined values, trim text, and strip whitespace).
*   **Encoding & Diacritics**: Romanian websites contain diacritics (ș, ț, ă, î, â) or custom HTML entities. Ensure cheerio is configured to read standard UTF-8 characters correctly.
*   **Request Caching**: Always wrap raw scraping operations in our central caching decorator (`CachingScraperDecorator.ts`) to avoid hitting dealer servers repeatedly in short periods.

---

## 2. Weight Parsing (`WeightConverter`)

Many retail listings name items using varying English and Romanian weight markers (e.g., `oz`, `uncie`, `uncii`, `ounce`, `ounces`, `gram`, `g`).

### Extraction Conventions
You must use `WeightConverter.parseWeight` to parse the weight from names.
*   **Support Fractional Ounces**: Parse expressions like `1/10 oz`, `1/4 oz`, `1/2 oz`, `0.1 oz`, etc.
*   **Support Multi-Packs**: Parse pack structures like `10 x 1g`, `5 x 1 oz`, or `100 x 1g`.
*   **Unit Multipliers**: Ensure ounces are converted precisely to grams ($1 \text{ oz} \approx 31.1034768 \text{ g}$).

---

## 3. Scraper Interface Implementation

All web scrapers MUST implement the `IScraperStrategy` interface in `/src/domain/IScraperStrategy.ts`:
```typescript
export interface IScraperStrategy {
  scrape(): Promise<Product[]>;
}
```

### Safety & Error Recovery
*   If a single product page fails to parse, log the warning, skip it, and continue parsing the remaining listings.
*   Never let a single item failure crash the entire scraping route. Return the successfully parsed products.
