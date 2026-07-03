---
type: Skill
title: "Pricing Engine and Normalization Guidelines"
description: Core formulas and constants used to calculate purity-adjusted gold/silver prices and BNR benchmark markups.
tags: [skill, pricing, purity-adjustment, markup]
timestamp: 2026-07-02T00:00:00Z
constraints:
  - Do not calculate price per gross weight unless the item is 24K (99.99%) pure gold
  - Standard bullion coin constants must be loaded from PurityEstimator.ts
agent_instructions: >
  Consult this skill when modifying pricing, fine weight calculations, or markup percentages.
---

# Skill: Pricing Engine and Normalization

This skill defines the technical details and formulas used to calculate purity-adjusted gold, silver, and platinum prices, and their relative markups against the national benchmark.

---

## 1. Purity-Adjusted Pricing (`PurityEstimator`)

### Core Formula for Non-24K Items
Retail coins and bars are minted in varying purities (e.g. 22K gold, 925 sterling silver). To calculate the true value, we must find the price per gram of **fine metal** (pure content) rather than gross weight:

$$\text{Fine Weight (g)} = \text{Gross Weight (g)} \times \text{Purity Percentage}$$
$$\text{Price per Gram Fine} = \frac{\text{Product Price}}{\text{Fine Weight (g)}}$$

### Special Coin Constants
For standard historical bullion coins with known purity-adjusted gold weights, use standard fine weight constants to avoid scrapers introducing rounding errors:
*   **American Eagle (1 oz Gold)**: Contains exactly `31.103g` fine gold (Gross weight is ~33.93g, purity is 91.67% or 22K).
*   **Krugerrand (1 oz Gold)**: Contains exactly `31.103g` fine gold (Gross weight is ~33.93g, purity is 91.67% or 22K).
*   **Sovereign (Gold)**: Contains exactly `7.322g` fine gold (Gross weight is ~7.988g, purity is 91.67% or 22K).
*   **Vreneli (20 Fr, Gold)**: Contains exactly `5.807g` fine gold (Gross weight is ~6.451g, purity is 90%).

These are centralized in `/src/domain/PurityEstimator.ts`. **Do NOT calculate these inside scrapers.**

---

## 2. Markup Percentage ("Adaos")

Rather than evaluating the "Spread" (buy/sell differential), which suffers from lack of dealer transparency, we utilize **Markup Percentage relative to the BNR (National Bank of Romania) Gold Benchmark**:

$$\text{Markup \%} = \frac{\text{Sell Price per Fine Gram} - \text{BNR Gold Price}}{\text{BNR Gold Price}} \times 100$$

*   **Positive Markup**: The product is sold at a premium to the current market benchmark (standard for retail bullion).
*   **Negative Markup / Discount**: The product is sold below spot price (extremely rare; indicating potential scrap value or special deals).

This calculation is run dynamically inside `/src/App.tsx` and displayed in our product grid.
