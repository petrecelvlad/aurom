---
type: Architecture
title: "System Architecture Overview"
description: High-level overview of the full-stack precious metals aggregator system.
tags: [architecture, overview, system-design]
timestamp: 2026-07-02T00:00:00Z
constraints:
  - High-level layout of backend scraping and frontend display
agent_instructions: >
  Read during onboarding (Phase 2, Step 5) to gain global system awareness before making changes.
---

# System Architecture Overview

This project is a real-time, full-stack **Precious Metals Aggregator** in Romania, comparing physical gold and silver bullion (coins and bars) across major local dealers (e.g., Tavex, Aurom, Avangard, BCR, Neogold).

---

## 🏗️ System Components

### 1. The Frontend (React/Vite/Tailwind v4)
*   Provides a highly polished, single-view dashboard designed with Inter and JetBrains Mono.
*   Enables sorting, filtering, and live search.
*   Calculates and visualizes **Markup Percentage ("Adaos")** relative to the live National Bank of Romania (BNR) gold rate.
*   State is plain React hooks (`useProducts`, `useBenchmark`) — no client-side store (Zustand, Redux, etc.). There is no client-side scrape-result cache either, because the API it polls is already backed by a persisted database snapshot, not a live scrape (see below).

### 2. The Backend (Cloudflare Worker)
*   `src/worker.ts` is the Composition Root and has two entry points:
    *   **`fetch` handler** (Hono app) — serves `GET /api/scrape/all` and `GET /api/benchmark/gold`. Both are **pure reads against D1** — this handler never scrapes. Non-`/api/*` requests never reach it at all; Workers Static Assets serves the built SPA directly.
    *   **`scheduled` handler** — runs once a minute (Cron Trigger, see `wrangler.jsonc`). Runs `ProductAggregatorService.aggregateAll()` across all 5 scrapers plus the BNR benchmark fetch, then persists both to D1. This is the **only** thing that writes to D1.
*   This split is the actual fix for "users see an empty list": the request path is decoupled from scraping entirely, so a slow or failing dealer site during a given minute never blocks or empties an API response — the last good snapshot is always what gets served.

### 3. The Database (Cloudflare D1)
*   `products` — current snapshot, upserted every tick, keyed by `(provider, sku)`.
*   `price_history` — append-only, but only gets a row when a product's price actually changed since the last tick (not one row per tick — see `D1ProductRepository`). Feeds the roadmap's historical price chart item.
*   `benchmark` / `benchmark_history` — same current+history pattern for the BNR gold rate.
*   See [UNIFIED_SCRAPER_SCHEMA.md](./UNIFIED_SCRAPER_SCHEMA.md) for the product shape and `/migrations/0001_initial_schema.sql` for the actual DDL.

### 4. The Scraping Adapters (Cheerio Scrapers)
*   Coded as adapters implementing the `IScraperStrategy` port interface.
*   Scrape major dealers' public e-commerce sites to parse prices, titles, image URLs, and availability states.
*   Fail gracefully: if a single dealer scraper breaks, `Promise.allSettled` in the aggregator means the tick still persists data from the other functional dealers.
*   Use native `fetch` (Workers runtime), not `axios`. BCR's PDF source uses `unpdf` (PDF.js-based, Workers-compatible), not `pdf-parse` (Node-only).

---

## 🛠️ Build & Run Commands

*   `npm run dev` — build the SPA once, then start `wrangler dev` (local Worker + local D1 + local assets).
*   `npm run build` — build client assets only (Vite).
*   `npm run deploy` — build, then `wrangler deploy` to Cloudflare.
*   `npm run lint` — type-check only (`tsc --noEmit`).
*   `npm run cf-typegen` — regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc` bindings.
*   Manually trigger the scheduled handler locally: `curl http://127.0.0.1:8788/cdn-cgi/handler/scheduled` (the port `wrangler dev` prints on startup).
