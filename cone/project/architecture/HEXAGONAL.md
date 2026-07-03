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

```
                      +-------------------+
                      |      CLIENT       | (React App)
                      +---------+---------+
                                | (HTTP API /api/products)
                                v
                      +-------------------+
                      |    ENTRY_POINT    | (Express server.ts)
                      +---------+---------+
                                |
                                v
                     +---------------------+
                     |       SERVICE       | (ProductAggregatorService)
                     +----------+----------+
                                |
                                | (Uses port)
                                v
                      +-------------------+
                      |       PORT        | (IScraperStrategy)
                      +---------+---------+
                                |
                                | (Implemented by)
            +-------------------+-------------------+
            |                   |                   |
            v                   v                   v
      +-----------+       +-----------+       +-----------+
      |  ADAPTER  |       |  ADAPTER  |       |  ADAPTER  | (Individual Scrapers:
      |  (Aurom)  |       |  (Tavex)  |       | (BCR, etc)|  Aurom, Tavex, BCR, etc)
      +-----------+       +-----------+       +-----------+
```

---

## 🧬 Core Architecture Pillars

1.  **Core Domain Models (`/src/domain/Product.ts`)**:
    *   No external dependencies. Pure data interfaces.
2.  **Core Logic / Utilities (`/src/domain/PurityEstimator.ts`, `/src/domain/WeightConverter.ts`)**:
    *   Pure mathematical/logical transformations.
    -   Encapsulates fine-weight calculations and unit weight parsing.
3.  **Ports (`/src/domain/IScraperStrategy.ts`)**:
    *   The interface that defines the contract between our aggregator orchestrator and individual dealer scrapers.
    *   Guarantees that scrapers are swappable.
4.  **Adapters (`/src/infrastructure/scrapers/`)**:
    *   Scraper implementations that parse specific dealer HTML (using Cheerio).
    *   They return raw products which are normalized by the service.
5.  **Composition / Orchestration (`/src/application/ProductAggregatorService.ts`)**:
    *   Orchestrates the scraping processes, performs post-scraping price normalization, markup calculations, sorting, and error logging.
