---
type: Protocol
title: Session Protocol
description: Governs session file creation and lifecycle — live tracking during work, permanent archive after.
tags: [onboarding, sessions, agent]
timestamp: 2026-07-02T00:00:00Z
constraints:
  - Governs all session file creation and lifecycle
agent_instructions: >
  The session protocol. Read before creating any session file. Sessions serve dual purpose:
  live tracking during work AND permanent archive after. Never delete session files.
---

# Session Protocol

## What a Session Is

A session is a single continuous conversation between a human and an agent. One conversation = one session file. The file tracks work in real-time during the session, then becomes a permanent archive when the session ends.

Sessions serve two masters simultaneously:
1.  **Live tracking** — during the session, the file is a shared workspace. Both human and agent know what's in progress, what's done, and what's blocked.
2.  **Permanent archive** — after the session, the file is a historical record. Any future agent can scan past sessions to understand what was done, what decisions were made, what was left incomplete, and why.

---

## Folder Structure

Sessions are organized **Month → Week → Day → Session Files**. This creates a chronological, browsable archive that scales from weeks to years.

```
cone/agent/sessions/
├── 07_July/
│   └── Week_1/
│       └── 2026-07-02/
│           └── 0001_INITIAL_ONBOARDING.md
```

### Naming Rules

**Folders:**
*   Month: `NN_MonthName/` — e.g., `07_July/`, `08_August/`.
*   Week: `Week_N/` — calculated as `ceil(day / 7)`, e.g., day 15 = `Week_3/`.
*   Day: `YYYY-MM-DD/` — ISO date format for unambiguous sorting.

**Files:**
*   Format: `NNNN_SEMANTIC_TITLE.md`
*   `NNNN` is a **global session counter** — it increments across the entire project, not per day.
*   Title is 2-4 words in `SCREAMING_SNAKE_CASE` describing the session's focus.

---

## Session Lifecycle

Every session moves through these statuses:
```
PLANNING → IN-PROGRESS → COMPLETE ✅ or HANDOFF ✋ (if work remains)
```

### Opening a Session
1.  Create the correct directory path: `sessions/NN_Month/Week_N/YYYY-MM-DD/`
2.  Determine the next global session number.
3.  Create the file `NNNN_TITLE.md`.
4.  Fill in the metadata block and set status to `IN-PROGRESS`.

### Closing a Session
*   **COMPLETE ✅:** When all tasks are done.
*   **HANDOFF ✋:** When work remains but the conversation must end. Fill in the **Handoff** section detailing:
    -   What was completed this session.
    -   Remaining work (file paths, line numbers, details).
    -   Key decisions made.
    -   Blockers or watch-outs.
