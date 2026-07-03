---
type: Protocol
title: "Propolis Metadata Standard"
description: Defines the @propolis metadata standard for source code files. Does not apply to markdown.
tags: [onboarding, propolis, agent]
timestamp: 2026-07-02T00:00:00Z
constraints:
  - Defines the metadata standard for source code files (not markdown)
agent_instructions: >
  This document defines the @propolis metadata standard for code files.
  All code files modified or created must include a valid JSON block inside a comment.
---

# Propolis: Code File Metadata Standard

Propolis is the metadata standard for **source code files** — `.ts`, `.tsx`, `.js`, `.html`, etc. It does not apply to markdown files in `cone/`, which use OKF YAML frontmatter instead.

---

## The Glass Box Principle

Every source code file in the project should be self-describing. An agent landing on any code file should instantly know: what it is, what constraints apply, and what to be careful about. Propolis metadata makes the codebase transparent without requiring the agent to read surrounding context.

---

## The Schema

Every source code file begins with a `@propolis` JSON block inside a comment:

```typescript
/**
 * @propolis
 * {
 *   "role": "SERVICE",
 *   "constraints": ["Stateless execution", "No direct database access"],
 *   "agent_instructions": "Core business logic for user authentication. Depends on AuthPort for credential validation. Do not add infrastructure imports."
 * }
 */
```

### Fields

| Field | Required | Description |
|---|---|---|
| `role` | Yes | Architectural classification of this file (e.g., `SERVICE`, `ADAPTER`, `PORT`, `UTIL`, `UI_COMPONENT`, `ENTRY_POINT`) |
| `constraints` | No | Array of key constraints or rules that apply |
| `agent_instructions` | No | Free-text guidance for agents modifying this file |
