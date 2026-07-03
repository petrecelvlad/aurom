---
type: Bootloader
title: "Start Here: Onboarding Sequence"
description: Framework entry point — the phased onboarding sequence agents follow on first load.
tags: [onboarding, agent, entrypoint]
timestamp: 2026-07-02T00:00:00Z
constraints:
  - Must be read before any other cone/ document
agent_instructions: >
  This is the framework entry point. Follow the phased onboarding sequence exactly.
  Each phase gives you a specific capability — do not skip ahead.
---

# Start Here: Onboarding Sequence

This document defines the order in which you read the framework. The sequence is dependency-ordered — each document builds on the previous one. Skipping ahead means operating without context that later documents assume you have.

---

## The Two Pillars

This framework is organized into two pillars:
*   **`cone/agent/`** — Everything the agent needs to operate: onboarding, personas, skills, sessions. This is YOUR operating system.
*   **`cone/project/`** — Everything about what was built: architecture, specs, memory, roadmap, archive. This is the PROJECT's documentation.

The separation matters. Agent docs change when workflows improve. Project docs change when the system changes. They evolve independently.

---

## Why Order Matters

This framework applies the Single Responsibility Principle to documentation. Each document has one job:
*   `AGENTS.md` / `AGENT.md` gives you your operational rules and constraints.
*   `PHILOSOPHY.md` gives you the framework's purpose and principles.
*   Your companion file (`GEMINI.md`) gives you your provider-specific protocols.
*   `CODING_COMPANION.md` gives you your coding discipline.
*   `OVERVIEW.md` gives you the system's architecture.
*   Personas give you your mode of thinking.

Reading them out of order means reading a document that references concepts you haven't encountered yet. Reading them in order means each document clicks into place.

**Note:** All documents in `cone/` use OKF (Open Knowledge Format) YAML frontmatter.

---

## Phase 1: Rules (How I Operate)

**Goal:** Understand the project's constraints, my behavioral standards, and my operational protocols.

| Step | Document | What I gain |
|---|---|---|
| 1 | `AGENTS.md` | My constitution: phases, guardrails, standing rules |
| 2 | [PHILOSOPHY.md](../../PHILOSOPHY.md) | Framework purpose, principles, and evolution model |
| 3 | [GEMINI.md](../../GEMINI.md) | My onboarding sequence, session protocol, memory rules |
| 4 | [CODING_COMPANION.md](./CODING_COMPANION.md) | My coding discipline: naming, functions, errors, types |

After Phase 1, I can operate safely on any task. I know the rules, the constraints, and how to write code that meets the project's standards.

---

## Phase 2: Territory (What Was Built)

**Goal:** Understand the system's architecture, components, and key relationships.

| Step | Document | What I gain |
|---|---|---|
| 5 | [OVERVIEW.md](../../project/architecture/OVERVIEW.md) | System design, key decisions, component structure |
| 6 | [SYSTEM_DESIGN.md](../../project/architecture/SYSTEM_DESIGN.md) | Deep-dive into precious metals domain models and services |
| 7 | [HEXAGONAL.md](../../project/architecture/HEXAGONAL.md) | Explanation of the clean Port & Adapter separation |

After Phase 2, I understand what was built and why. I can assess blast radius before making changes and navigate the codebase with context.

---

## Phase 3: Identity (How I Think)

**Goal:** Adopt the mental models that shape my reasoning for this session.

| Step | Document | What I gain |
|---|---|---|
| 8 | [PRECIOUS_METALS_EXPERT.md](../personas/PRECIOUS_METALS_EXPERT.md) | Adopt the gold & silver aggregator domain expert persona |

After Phase 3, I'm fully onboarded. I have rules, territory, and identity. I can begin work.

---

## On-Demand Reading

These documents are consulted during work, not during onboarding:

| When I need to... | I read... |
|---|---|
| Create or manage a session file | [SESSIONS.md](./SESSIONS.md) |
| Add code file metadata | [PROPOLIS.md](./PROPOLIS.md) |
| Check known failure modes | [PLAYBOOK.md](../../project/memory/PLAYBOOK.md) (when available) |
| Check anti-patterns | [ANTI_PATTERNS.md](../../project/memory/ANTI_PATTERNS.md) (when available) |
| Consult pricing normalization | [PRICING_ENGINE.md](../skills/PRICING_ENGINE.md) |
| Consult web scraper specs | [SCRAPING_AND_PARSING.md](../skills/SCRAPING_AND_PARSING.md) |

---

## Continuing a Previous Session

Before creating a new session file, check `cone/agent/sessions/` for any file with `IN-PROGRESS` or `HANDOFF` status.
*   `IN-PROGRESS` → continue from it. Do not create a new file.
*   `HANDOFF` → read the handoff section, then create a new session file that references it.

See [SESSIONS.md](./SESSIONS.md) for the full session protocol.
