---
type: session
title: Fix 24K Gold Purity and Karats Mapping
timestamp: 2026-07-02T10:21:00Z
status: "COMPLETE ✅"
constraints:
  - Defaults unset gold purity to 24K if purity is >= 99%
  - Restores correct data listings for all 24K gold investment products under the Karat Filter
agent_instructions: >
  Ensure that purity >= 0.99 matches 24K pure gold for standard investment bars and coins.
---

# Session 0008: Fix 24K Gold Purity and Karats Mapping

## Context
The user observed that standard 24K gold investment products (such as pure gold bars and coins that did not explicitly contain "24k" or other exact karat strings in their names) were incorrectly categorized as having no karats (`-` value in the table). This resulted in them being omitted when the "24K" filter was selected.

---

## Actions Taken

1.  **Identified Root Cause (`PurityEstimator.ts`)**:
    *   Gold products are processed by `PurityEstimator.estimate()`. If a gold product name did not hit any explicit karat descriptors (e.g. "22k", "18k") or coin keywords (e.g. Krugerrand, Sovereign), its `purity` defaulted to `1.0` (which is correct), but its `karats` remained `null`.
    *   Because `karats` was `null`, it showed as `-` in the table and could not be filtered by 24K.

2.  **Resolved the Issue**:
    *   Enhanced `PurityEstimator.estimate()` to assign `karats = 24` if the metal is `Gold`, `karats` is `null`, and the purity is `>= 0.99` (encompassing the default `1.0` and explicit `.999`/`.9999` purity levels).
    *   This ensures all standard 24K pure gold bars ("lingouri") and bullion coins are recognized and filtered accurately under "24K".

3.  **Validation**:
    *   Linter passed successfully (`npm run lint`).
    *   Build compiled successfully (`npm run build`).

---

## Handoff & Next Steps

*   **Status**: `COMPLETE ✅`
*   **Result**: All gold investment listings are now fully integrated under the Karat Filter hierarchy.
