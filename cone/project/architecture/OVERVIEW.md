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
*   `src/worker.ts` is a Hono app with **no scraping code in it at all** — it only ever talks to D1:
    *   `GET /api/scrape/all` / `GET /api/benchmark/gold` — pure reads. Non-`/api/*` requests never reach it either; Workers Static Assets serves the built SPA directly.
    *   `POST /api/ingest` — the only thing that writes to D1. Requires a shared-secret header (`X-Ingest-Secret`, checked against the `INGEST_SECRET` Worker secret) and validates the payload with Zod before writing.
*   This split (never scrape on the request path) is the actual fix for "users see an empty list": a slow or failing dealer site never blocks or empties an API response — the last good snapshot is always what gets served.

### 3. The Scraper Runner (GitHub Actions, not Cloudflare)
*   `scripts/scrapeAndIngest.ts` runs `ProductAggregatorService.aggregateAll()` across all 5 scrapers plus the BNR benchmark fetch, then `POST`s the result to `/api/ingest`.
*   Triggered by `.github/workflows/scrape.yml` on a **5-minute schedule** (GitHub Actions' practical minimum, and it can slip further under load — not a hard guarantee), plus a manual `workflow_dispatch`.
*   **Why not a Cloudflare Cron Trigger:** Workers Free plan caps a single invocation at 10ms of CPU time. That budget excludes I/O wait (the scrape requests themselves), but cheerio parsing ~15 dealer pages and `unpdf` extracting the BCR PDF are real CPU work that doesn't fit in 10ms regardless of how the ticks are split. Running the same scraper code under plain Node on a GitHub Actions runner has no such limit, and costs nothing on a public repo.
*   The scraper/domain code itself is completely runtime-agnostic — the exact same `IScraperStrategy` implementations run unchanged under Node (GitHub Actions) or would run under Workers if the CPU budget ever allowed it again (e.g., on the Paid plan).

### 4. The Database (Cloudflare D1)
*   `products` — current snapshot, upserted every run, keyed by `(provider, sku)`.
*   `price_history` — append-only, but only gets a row when a product's price actually changed since the last run (not one row per run — see `D1ProductRepository`). Feeds the roadmap's historical price chart item.
*   `benchmark` / `benchmark_history` — same current+history pattern for the BNR gold rate.
*   See [UNIFIED_SCRAPER_SCHEMA.md](./UNIFIED_SCRAPER_SCHEMA.md) for the product shape and `/migrations/0001_initial_schema.sql` for the actual DDL.

### 5. The Scraping Adapters (Cheerio Scrapers)
*   Coded as adapters implementing the `IScraperStrategy` port interface.
*   Scrape major dealers' public e-commerce sites to parse prices, titles, image URLs, and availability states.
*   Fail gracefully: if a single dealer scraper breaks, `Promise.allSettled` in the aggregator means the run still ingests data from the other functional dealers.
*   Use native `fetch`, not `axios`. BCR's PDF source uses `unpdf` (PDF.js-based), not `pdf-parse` (Node-only, and irrelevant now anyway since this code doesn't need to run in Workers — but `unpdf` remains the better choice regardless).

---

## 🛠️ Build & Run Commands

*   `npm run dev` — build the SPA once, then start `wrangler dev` (local Worker + local D1 + local assets).
*   `npm run build` — build client assets only (Vite).
*   `npm run deploy` — build, then `wrangler deploy` to Cloudflare.
*   `npm run lint` — type-check only (`tsc --noEmit`).
*   `npm run cf-typegen` — regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc` bindings.
*   `npm run scrape` — run `scripts/scrapeAndIngest.ts` locally (needs `WORKER_URL` and `INGEST_SECRET` env vars pointed at a running `wrangler dev` or the real deployment) — this is how you manually trigger a data refresh instead of waiting for GitHub Actions.
