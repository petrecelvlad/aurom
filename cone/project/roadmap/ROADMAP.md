---
type: Roadmap
title: "Project Roadmap"
description: List of milestones achieved, short-term active tasks, and long-term features.
tags: [roadmap, project-management, backlog]
timestamp: 2026-07-02T00:00:00Z
constraints:
  - Tracks active work items and serves as the source of truth for upcoming tasks
agent_instructions: >
  Consult this roadmap during Phase 1/Step 3 to identify outstanding work items for the project.
---

# Project Roadmap

This roadmap lists the current status, milestones achieved, and upcoming tasks for the Precious Metals Aggregator.

---

## 🚀 Milestones Achieved

- [x] **Hexagonal Architecture Foundations**: Core business, domain logic, and scrapers completely decoupled from Express and React UI.
- [x] **Provider Scrapers**: Fully integrated scrapers for Aurom, Avangard, Neogold, Tavex, and BCR.
- [x] **Centralized Normalization**: Implemented `PurityEstimator` and `WeightConverter` for exact fine weight pricing.
- [x] **Interactive Dashboard**: Styled UI showcasing real-time BNR gold pricing benchmark, product tables, filtering by metal, and sorting by "Adaos" (markup percentage).
- [x] **cone-lite Integration**: Migrated and structured all system documentation into the Two-Pillar framework (`cone/agent/` and `cone/project/`).
- [x] **Propolis Metadata Coverage**: All 23 active source files under `/src/` carry `@propolis` headers.
- [x] **Cloudflare Migration**: Moved off Express/Node entirely. A Cron Trigger scrapes all 5 providers + the BNR benchmark every 1 minute into D1; the API (`fetch` handler) only ever reads the last persisted snapshot, never scrapes on request. Frontend served via Workers Static Assets from the same Worker. See [OVERVIEW.md](../architecture/OVERVIEW.md) and [HEXAGONAL.md](../architecture/HEXAGONAL.md).
- [x] **Offline Resilience**: Superseded by the Cloudflare migration above — D1 *is* the persistence layer now, not an in-memory decorator. A dealer site being briefly unresponsive during one cron tick just means that tick doesn't update that provider's rows; the last good snapshot keeps serving.

---

## 📋 Active Work Queue

### Short-Term Backlog
- [ ] **Dynamic BNR Exchange Rates**: Fully automate fetching live EUR-to-RON or USD-to-RON exchange rates from the BNR public feeds if certain scrapers return foreign currency.
- [ ] **GitHub Actions / Wrangler CI**: Currently deploys are manual (`npm run deploy`). Wire up automatic deploys on push to `main`.

### Long-Term Goals
- [ ] **Historical Gold Price Charts**: The data layer is ready (`price_history` / `benchmark_history` tables, change-only writes) — the visualization itself (`recharts` or `d3`) is not yet built.
- [ ] **Smart Price Alerts**: Allow users to set email or webhook alerts when a specific coin/bar drops below a target markup percentage ("Adaos").
- [ ] **Interactive Scraper Testing Terminal**: Build an administrative view to run, test, and debug individual dealer scraper strategies from the dashboard.
