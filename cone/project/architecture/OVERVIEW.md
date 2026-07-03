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
*   Uses client-side caching to maintain responsiveness and avoid hitting scraper APIs repeatedly.

### 2. The Backend (Node.js/Express Server)
*   Serves client assets and hosts two API endpoints, both defined in `server.ts`:
    *   `GET /api/scrape/all` — aggregates and returns products from every registered scraper.
    *   `GET /api/benchmark/gold` — fetches the live BNR gold rate from `bnr.ro/nbrfxrates.xml`.
*   `server.ts` is the Composition Root: it instantiates each scraper, wraps it in `CachingScraperDecorator`, and registers it with `ProductAggregatorService`.
*   State on the client is plain React hooks (`useProducts`, `useBenchmark`) polling these endpoints — there is no client-side store (Zustand, Redux, etc.).

### 3. The Scraping Adapters (Cheerio Scrapers)
*   Coded as adapters implementing the `IScraperStrategy` port interface.
*   Scrape major dealers' public e-commerce sites to parse prices, titles, image URLs, and availability states.
*   Fail gracefully: if a single dealer scraper breaks, the aggregator continues serving data from the other functional dealers.

---

## 🛠️ Build & Run Commands

*   `npm run dev` — start the live development server (`tsx server.ts`, Vite middleware mode).
*   `npm run build` — build client assets (Vite) and bundle the server (`esbuild` → `dist/server.cjs`).
*   `npm start` — run the production bundle.
*   `npm run lint` — type-check only (`tsc --noEmit`).
