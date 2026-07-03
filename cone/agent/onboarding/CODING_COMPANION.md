---
type: Guide
title: "Coding Companion"
description: Standard coding discipline — naming, functions, errors, types, and comments.
tags: [onboarding, coding, guidelines]
timestamp: 2026-07-02T00:00:00Z
constraints:
  - Applies to all code contributions in this repository
agent_instructions: >
  Read at the start of any session where you will write or modify code.
  Always write code for the next reader, not just the compiler.
---

# Coding Companion

## 1. The Prime Directive
**Write for the next reader, not for the compiler.**
The compiler accepts anything that type-checks. The next reader — an agent or human six months from now — needs to understand what the code does, why it exists, and what it would break if changed. Every decision below flows from this.

---

## 2. Naming
Names are the primary form of documentation. A good name makes a comment unnecessary.

*   **Variables and functions:**
    - Name what a thing *is* or *does*, not how it's implemented: `userHasAccess` not `checkBool`.
    - Boolean names start with `is`, `has`, `can`, `should`: `isExpired`, `hasPermission`.
    - Functions that return a value are named for the value: `getSessionId()`, `buildPayload()`.
    - Functions with side effects are named for the action: `saveMessage()`, `flushBuffer()`.
    - Avoid abbreviations unless universally understood in the domain (`id`, `url`, `jwt` are fine; `msgBuf`, `tmpRef` are not).
*   **Collections:**
    - Name collections in the plural: `messages`, `cells`, `handlers`.
    - Name a single item from a collection with the singular: `message`, `cell`, `handler`.
*   **Anti-patterns:**
    - `data`, `info`, `stuff`, `thing`, `temp` — these carry zero information.
    - `manager`, `service`, `util`, `helper` as suffixes without a qualifier — `AuthService` yes, `Service` no.

---

## 3. Function Discipline
**One function, one job.** If you need "and" to describe what a function does, split it.

*   **Size heuristic:** A function that doesn't fit on one screen (roughly 40 lines) is a signal — not a rule — that it's doing too much.
*   **The three categories of code:**
    - **Pure transformations:** input in, output out, no side effects. These are trivially testable and composable. Maximize their use (e.g. `PurityEstimator`, `WeightConverter`).
    - **Effectful operations:** I/O, mutations, network calls. Isolate these at the edges. Never mix transformation logic inside an effect.
    - **Orchestrators:** coordinate pure transformations and effectful operations. They should contain almost no logic of their own, just sequencing (e.g. `ProductAggregatorService`).
*   **Arguments:**
    - 3 or fewer positional arguments. Beyond that, use an options object.
    - Don't use boolean arguments to switch behavior: `processMessage(message, true)`. Use two functions or an options object with a named field.

---

## 4. Error Handling
**Fail loudly, fail early.** Silent failures are the hardest class of bug to diagnose.

*   **Expected failures:** validate inputs, return typed error results or throw typed errors. The caller knows what to handle.
*   **Unexpected failures:** let them propagate. Swallowing `unknown` exceptions hides bugs.
*   **Error messages:**
    - Include context: what was being attempted, what went wrong, what the caller can do.
    - Bad: `"Error: failed"`. Good: `"Scraper for Tavex failed to parse price on product 'Gold Krugerrand' (selector '.price' was empty)"`.

---

## 5. Comment Discipline
**Default to no comments.** Well-named code is self-documenting.

*   **Write a comment when:**
    - The WHY is non-obvious: a hidden constraint, a business rule, a platform quirk.
    - The code would surprise a reasonable reader who understands the domain.
*   **Never write a comment when:**
    - It restates what the code already says: `// increment counter` above `counter++`.
    - It references the current task or PR: `// added for the auth fix`.

---

## 6. Type Discipline
**Types are documentation that never goes stale.**

*   Prefer explicit types at module boundaries: function signatures, exported values, API contracts.
*   `any` at a boundary is a contract hole — a place where the type system can no longer help.
*   Enums and discriminated unions make impossible states impossible — use them for state machines and result types.
*   **The boundary rule:** External inputs (API responses, user input, scraped HTML) must be validated and typed at entry. Once inside the system boundary, trust the types.
