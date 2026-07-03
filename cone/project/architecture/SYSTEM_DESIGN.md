---
type: Architecture
title: "Core System Design Principles"
description: Architectural commandments, SOLID rules, and dependency guidelines.
tags: [architecture, hexagonal, solid, constraints]
timestamp: 2026-07-02T00:00:00Z
constraints:
  - This document serves as the supreme law of dependencies inside the codebase
agent_instructions: >
  Consult this document before making any changes to components or core layers.
---

# Core System Design Principles

## Core Philosophy

This document serves as the supreme architectural law for the Precious Metals Aggregator application. All code written, refactored, or maintained must adhere to the principles defined here. The architecture is grounded in **Hexagonal Architecture (Ports & Adapters)** and strictly follows **SOLID Principles**.

### 1. Hexagonal Architecture
The application is structured into concentric layers. The innermost layer contains the core business logic (the "engine"), completely agnostic to the delivery mechanism (UI), data storage, or external APIs (such as Tavex.ro).

*   **Core Domain:** Defines the entities (`StandardizedProduct`, `PurityInfo`) and the rules governing them (`PurityEstimator`, `WeightConverter`, `PriceParser`).
*   **Ports (Interfaces):** Defines the contracts for how the core interacts with the outside world (`IScraperStrategy`, `IProductRepository`, `IBenchmarkRepository`).
*   **Adapters:** Implement the ports (e.g., `TavexScraper`, `D1ProductRepository`, React presentation components).

### 2. SOLID Principles
*   **Single Responsibility Principle (SRP):** Every function, class, and module must have only one reason to change. A scraper only scrapes; a UI component only renders.
*   **Open/Closed Principle (OCP):** Modules must be open for extension but closed for modification. New scrapers can be added by implementing the `ScraperPort` without changing the core aggregator logic.
*   **Liskov Substitution Principle (LSP):** Any implementation of a port must be fully substitutable for the port interface without breaking the system.
*   **Interface Segregation Principle (ISP):** Keep ports small and focused. Do not force adapters to implement methods they do not need.
*   **Dependency Inversion Principle (DIP):** High-level modules (core domain) must not depend on low-level modules (UI or web scrapers). Both must depend on abstractions (ports).

## The Architectural Commandments

These are the hard, technical laws of our codebase. Violation is not permitted.

### I. Thou Shalt Honor the Dependency Rule.
Our architecture is strictly layered, per the real directory structure under `/src/` (see [HEXAGONAL.md](./HEXAGONAL.md)). A layer can ONLY depend on layers below it. The flow is always:
`domain/` -> `application/` -> `infrastructure/` -> `presentation/`
*A file in `domain/` must never import a file from `infrastructure/` or `presentation/`.*

### II. Thou Shalt Decouple Thy "Engine" from Thy "Dashboard".
Core scraping logic and data aggregation must be pure and independent of the React UI and the Cloudflare Worker's HTTP layer. The core logic (`ProductAggregatorService` + scrapers) has no dependency on Hono, D1, or React. The React UI is simply one "view" of the engine's persisted output, and `src/worker.ts` is merely the composition root + HTTP/cron adapter.

### III. Thou Shalt Manage State Simply Until It Hurts.
There is no client-side store — state lives in plain React hooks (`useProducts`, `useBenchmark`) that poll the Worker's `/api/*` routes, which are pure D1 reads (see [HEXAGONAL.md](./HEXAGONAL.md)). Do not introduce a global store (Zustand, Redux, Context-as-store) speculatively; only do so if prop-drilling or re-render cost becomes a demonstrated problem.
