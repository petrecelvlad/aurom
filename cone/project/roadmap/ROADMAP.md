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

---

## 📋 Active Work Queue

### Short-Term Backlog
- [ ] **Propolis Metadata Coverage**: Add propolis metadata headers to all active source code files under `/src/` to make them self-describing.
- [ ] **Dynamic BNR Exchange Rates**: Fully automate fetching live EUR-to-RON or USD-to-RON exchange rates from the BNR public feeds if certain scrapers return foreign currency.
- [ ] **Offline Resilience**: Enhance the `CachingScraperDecorator` to persist scraped items locally or inside server memory for a grace period if dealer websites become unresponsive.

### Long-Term Goals
- [ ] **Historical Gold Price Charts**: Implement historical spot price visualizations using `recharts` or `d3` based on cached benchmark price archives.
- [ ] **Smart Price Alerts**: Allow users to set email or webhook alerts when a specific coin/bar drops below a target markup percentage ("Adaos").
- [ ] **Interactive Scraper Testing Terminal**: Build an administrative server view to run, test, and debug individual dealer scraper strategies from the dashboard.
