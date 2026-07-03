---
type: Protocol
title: cone-lite Philosophy
description: The framework's philosophy and evolution principles — WHAT this system is and WHY it exists.
tags: [philosophy, foundational]
timestamp: 2026-07-02T00:00:00Z
constraints:
  - Foundational document — changes here affect the entire framework
agent_instructions: >
  Read during onboarding (Phase 1, Step 2). This document defines WHAT this system is
  and WHY it exists. It does not define HOW to use it — that's in the onboarding docs.
---

# cone-lite Philosophy

> Documentation is not passive reference. It is active behavioral programming for AI coding agents.

`cone-lite` is designed around the understanding that when an AI agent enters a codebase, their onboarding speed, reasoning quality, and execution precision depend entirely on the structure and clarity of the project's knowledge base. 

By applying software engineering principles—like **Single Responsibility**, **Modular Coupling**, and **Dependency Inversion**—to documentation, we transform flat reference text into a reliable operating system for developers and AI agents alike.

---

## Core Principles

### 1. The Two-Pillar Separation
We maintain a strict boundary between:
*   **The Agent Pillar (`cone/agent/`)**: Rules of engagement, onboarding paths, reasoning personas, procedural skills, and session records. This dictates **how** agents work.
*   **The Project Pillar (`cone/project/`)**: Architectural guardrails, specifications, operational guides, institutional memory, and roadmaps. This dictates **what** agents build.

By keeping these separate, we can update our agent reasoning tools (personas, workflows) without muddying the technical specs of the product.

### 2. SRP for Documents (Single Responsibility Principle)
Every document has exactly one job:
*   Do not mix architectural guardrails with user guides.
*   Do not mix onboarding procedures with live roadmap tasks.
*   Keep files small, modular, and tightly focused to respect agent context windows and prevent info-slop.

### 3. Phased Onboarding
Agents do not need to "read everything" upfront. They should follow the dependency-ordered sequence defined in [AGENT.md](../AGENT.md) and [START_HERE.md](agent/onboarding/START_HERE.md):
1.  **Orient**: Understand who we are, what the project is, and how we operate. Defined in [AGENT.md](../AGENT.md).
2.  **Learn**: Read the architectural guardrails and domain rules.
3.  **Execute**: Consult the active session, roadmap, or task instructions.

### 4. Active Memory & Session Records
We treat every conversation as a continuous session. By archiving sessions in `cone/agent/sessions/`, we preserve:
*   Why decisions were made (context).
*   What was modified or created (diff tracking).
*   What remains to be done (handoff protocol).

This prevents agents in future chat sessions from repeating past mistakes or reverting intentional architecture choices.
