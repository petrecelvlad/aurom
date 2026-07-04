---
type: Architecture
title: "Hexagonal Architecture Port & Adapter Separation"
description: Architectural separation guidelines to keep the core aggregator logic pure.
tags: [architecture, hexagonal, guidelines]
timestamp: 2026-07-02T00:00:00Z
constraints:
  - Strict separation between core logic and scraper adapters
agent_instructions: >
  Read to understand how our scraping engines are isolated from our domain services.
  Always implement scrapers as adapters implementing the IScraperStrategy port.
---

# Hexagonal Architecture Port & Adapter Separation

To keep the precious metals aggregation engine pure, testable, and robust against dealer website markup changes, we strictly implement a Ports & Adapters separation (Hexagonal Architecture).

---

## 🏗️ Structure Overview

The write path and the read path run in **two different runtimes** entirely, connected only through D1 and one authenticated HTTP call — they never call each other directly.

**Write path — `scripts/scrapeAndIngest.ts`, run under Node by GitHub Actions once daily:**
```
                      +-------------------+
                      |    ENTRY_POINT    | (scripts/scrapeAndIngest.ts — runs under Node,
                      +---------+---------+  outside Cloudflare entirely — see OVERVIEW.md
                                v            for why it isn't a Cloudflare Cron Trigger)
                     +---------------------+
                     |       SERVICE       | (ProductAggregatorService)
                     +----------+----------+
                                | (Uses port)
                                v
                      +-------------------+
                      |       PORT        | (IScraperStrategy)
                      +---------+---------+
                                | (Implemented by)
            +-------------------+-------------------+
            v                   v                   v
      +-----------+       +-----------+       +-----------+
      |  ADAPTER  |       |  ADAPTER  |       |  ADAPTER  | (Aurom, Tavex, Avangard,
      +-----------+       +-----------+       +-----------+   Neogold, BCR)
                                |
                                v (aggregated products, HTTP POST)
                      +-------------------+
                      |    ENTRY_POINT    | (src/worker.ts — POST /api/ingest,
                      +---------+---------+  authenticated by shared secret)
                                v
                      +-------------------+
                      |       PORT        | (IProductRepository / IBenchmarkRepository)
                      +---------+---------+
                                v
                      +-------------------+
                      |      ADAPTER      | (D1ProductRepository / D1BenchmarkRepository)
                      +---------+---------+
                                v
                              [ D1 ]
```

**Read path — `fetch` handler, one per HTTP request, runs in the Worker:**
```
                      +-------------------+
                      |      CLIENT       | (React SPA, served by Workers Static Assets —
                      +---------+---------+  requests never even reach the Worker for these)
                                | (HTTP GET /api/scrape/all, /api/benchmark/gold)
                                v
                      +-------------------+
                      |    ENTRY_POINT    | (src/worker.ts — fetch handler, Hono)
                      +---------+---------+
                                v (read-only — never scrapes)
                      +-------------------+
                      |       PORT        | (IProductRepository / IBenchmarkRepository)
                      +---------+---------+
                                v
                      +-------------------+
                      |      ADAPTER      | (D1ProductRepository / D1BenchmarkRepository)
                      +---------+---------+
                                v
                              [ D1 ]
```

Note that `src/worker.ts` appears in **both** diagrams but never imports scraper code — the ingest route only receives already-scraped JSON over HTTP and validates/persists it. This is what keeps the Worker's own CPU cost low regardless of how much scraping work happens upstream.

---

## 🧬 Core Architecture Pillars

1.  **Core Domain Models (`/src/domain/Product.ts`)**:
    *   No external dependencies. Pure data interfaces.
2.  **Core Logic / Utilities (`/src/domain/PurityEstimator.ts`, `/src/domain/WeightConverter.ts`, `/src/domain/PriceParser.ts`)**:
    *   Pure mathematical/logical transformations.
    -   Encapsulates fine-weight calculations, unit weight parsing, and Romanian price-string parsing.
3.  **Ports (`/src/domain/IScraperStrategy.ts`, `/src/domain/IProductRepository.ts`, `/src/domain/IBenchmarkRepository.ts`)**:
    *   `IScraperStrategy` defines the contract between the aggregator orchestrator and individual dealer scrapers — guarantees scrapers are swappable, and lets `scripts/scrapeAndIngest.ts` (Node) reuse the exact same scraper classes the Worker would use if it ever scraped directly.
    *   `IProductRepository` / `IBenchmarkRepository` define the contract between D1 and whatever calls it (the Worker's `/api/*` routes) — guarantees D1 could be swapped for another store without touching those routes.
4.  **Adapters (`/src/infrastructure/scrapers/`, `/src/infrastructure/db/`, `/src/infrastructure/benchmark/`)**:
    *   Scraper implementations parse specific dealer HTML/JSON/PDF (Cheerio, unpdf) and return raw products normalized by the service.
    *   `D1ProductRepository` / `D1BenchmarkRepository` implement the repository ports against Cloudflare D1.
5.  **Composition / Orchestration (`/src/application/ProductAggregatorService.ts`, `scripts/scrapeAndIngest.ts`, `/src/worker.ts`)**:
    *   `ProductAggregatorService` orchestrates the scraping processes and performs post-scraping price normalization and markup calculations.
    *   `scripts/scrapeAndIngest.ts` is the Composition Root for scraping — it wires scrapers to the aggregator and POSTs the result onward. It never touches D1 directly.
    *   `src/worker.ts` is the Composition Root for persistence and serving — it wires the repository ports to D1, and is the only place that instantiates D1 adapters. It never instantiates a scraper.
