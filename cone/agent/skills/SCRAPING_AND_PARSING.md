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
We use `cheerio` to parse scraped HTML responses inside the Cloudflare Worker.
*   **Selector Guarding**: Always wrap selector extraction in safe check structures (e.g., check for nulls or undefined values, trim text, and strip whitespace).
*   **Encoding & Diacritics**: Romanian websites contain diacritics (ș, ț, ă, î, â) or custom HTML entities. Ensure cheerio is configured to read standard UTF-8 characters correctly.
*   **HTTP requests**: Use `fetchWithTimeout` from `src/infrastructure/scrapers/httpClient.ts` (Workers-native `fetch`, not `axios`) for a consistent request timeout.
*   **Request Cadence**: There is no per-request or per-instance caching decorator anymore — `scripts/scrapeAndIngest.ts`, run by GitHub Actions on a schedule (see `.github/workflows/scrape.yml`), is the only thing that ever invokes scrapers. Do not add scraper-level caching; if a rate-limiting concern comes up, it belongs in the GitHub Actions schedule interval or the scraper's own request pacing, not a wrapper around `IScraperStrategy`.
*   **Request Pacing**: Any scraper making multiple sequential requests to the same domain (pagination, category loops) must call `politeDelay()` from `httpClient.ts` between requests — a random 1-3s wait, skipped only before the first request. This is deliberate: it paces requests instead of firing them back-to-back, which is both gentler on the dealer's server and closer to how a person actually clicks through pages. Aurom Investment (paginated, capped at 30 pages), Neogold (5 categories), and Tavex (2 categories) all do this; Avangard (single JSON call) and BCR (single PDF fetch) don't need it since they only make one request each.

---

## 2. Price Parsing (`PriceParser`)

Romanian price text is ambiguous: a dot or comma can be a decimal separator or a thousands separator depending on the site. You must use `PriceParser.parseRonPrice` to convert scraped price text into a RON float — never hand-roll comma/dot stripping logic inside a scraper.

*   Handles mixed format (`"1.234,50 lei"`), decimal-comma-only (`"550,50"`), and ambiguous decimal-dot (`"125.50"` vs. thousands `"1.234"`).
*   Not for pre-structured numeric sources — if a provider gives you JSON with a numeric price field (e.g. a Shopify `variant.price`), parse it directly instead.
*   Not for non-Romanian formats — e.g. BCR's PDF price figures use thousands-comma with no decimal fraction, a different convention entirely.

---

## 3. Weight Parsing (`WeightConverter`)

Many retail listings name items using varying English and Romanian weight markers (e.g., `oz`, `uncie`, `uncii`, `ounce`, `ounces`, `gram`, `g`).

### Extraction Conventions
You must use `WeightConverter.parseWeight` to parse the weight from names.
*   **Support Fractional Ounces**: Parse expressions like `1/10 oz`, `1/4 oz`, `1/2 oz`, `0.1 oz`, etc.
*   **Support Multi-Packs**: Parse pack structures like `10 x 1g`, `5 x 1 oz`, or `100 x 1g`.
*   **Unit Multipliers**: Ensure ounces are converted precisely to grams ($1 \text{ oz} \approx 31.1034768 \text{ g}$).

---

## 4. Scraper Interface Implementation

All web scrapers MUST implement the `IScraperStrategy` interface in `/src/domain/IScraperStrategy.ts`:
```typescript
export interface IScraperStrategy {
  get providerName(): string;
  scrape(): Promise<StandardizedProduct[]>;
}
```

### Safety & Error Recovery
*   If a single product page fails to parse, log the warning, skip it, and continue parsing the remaining listings.
*   Never let a single item failure crash the entire scraping route. Return the successfully parsed products.
