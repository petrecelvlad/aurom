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

The Worker has two separate entry points that never call each other directly — they're connected only through D1.

**Write path — `scheduled` handler, runs every 1 minute (Cron Trigger):**
```
                      +-------------------+
                      |    ENTRY_POINT    | (src/worker.ts — scheduled handler)
                      +---------+---------+
                                v
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
                                v (aggregated products)
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

**Read path — `fetch` handler, one per HTTP request:**
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

---

## 🧬 Core Architecture Pillars

1.  **Core Domain Models (`/src/domain/Product.ts`)**:
    *   No external dependencies. Pure data interfaces.
2.  **Core Logic / Utilities (`/src/domain/PurityEstimator.ts`, `/src/domain/WeightConverter.ts`, `/src/domain/PriceParser.ts`)**:
    *   Pure mathematical/logical transformations.
    -   Encapsulates fine-weight calculations, unit weight parsing, and Romanian price-string parsing.
3.  **Ports (`/src/domain/IScraperStrategy.ts`, `/src/domain/IProductRepository.ts`, `/src/domain/IBenchmarkRepository.ts`)**:
    *   `IScraperStrategy` defines the contract between the aggregator orchestrator and individual dealer scrapers — guarantees scrapers are swappable.
    *   `IProductRepository` / `IBenchmarkRepository` define the contract between the Worker's entry points and persistence — guarantees D1 could be swapped for another store without touching the scheduled/fetch handlers.
4.  **Adapters (`/src/infrastructure/scrapers/`, `/src/infrastructure/db/`, `/src/infrastructure/benchmark/`)**:
    *   Scraper implementations parse specific dealer HTML/JSON/PDF (Cheerio, unpdf) and return raw products normalized by the service.
    *   `D1ProductRepository` / `D1BenchmarkRepository` implement the repository ports against Cloudflare D1.
5.  **Composition / Orchestration (`/src/application/ProductAggregatorService.ts`, `/src/worker.ts`)**:
    *   `ProductAggregatorService` orchestrates the scraping processes and performs post-scraping price normalization and markup calculations.
    *   `src/worker.ts` is the Composition Root — it wires scrapers, the aggregator, and repositories together, and is the only place that instantiates concrete adapters.
