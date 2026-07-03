# Agent Onboarding Guide

Welcome, Agent! To work on the Precious Metals Aggregator, you must follow this structured onboarding protocol. Do not attempt to modify code or propose architectural changes until you have successfully executed all phases of this onboarding sequence.

---

## Onboarding Protocol

```
┌──────────────────────────────────────────────┐
│                  1. ORIENT                   │
│   Read /AGENTS.md & /GEMINI.md               │
│   (Establish identity, rules, & system bounds)│
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                   2. LEARN                   │
│   Read:                                      │
│   - /cone/agent/personas/                    │
│   - /cone/agent/skills/                      │
│   - /cone/project/architecture/SYSTEM_DESIGN │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                  3. EXECUTE                  │
│   Check active sessions in:                  │
│   - /cone/agent/sessions/                    │
│   Solve current task keeping scope tight.    │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                  4. VALIDATE                 │
│   Verify syntax, types, and build:           │
│   - Run `npm run lint` & `npm run build`     │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                  5. RECORD                   │
│   Update/create active session logs under    │
│   - /cone/agent/sessions/                    │
└──────────────────────────────────────────────┘
```

---

## The Phased Flow Explained

### Phase 1: Orient
*   **Action**: View `/AGENTS.md` and `/GEMINI.md`.
*   **Why**: This instills the project rules, target pricing conventions (purity-adjusted pricing), and custom markup logic directly into your system prompt.

### Phase 2: Learn
*   **Action**: View `/cone/agent/personas/PRECIOUS_METALS_EXPERT.md` and related `/cone/agent/skills/`.
*   **Why**: This primes your reasoning mechanism to think like a seasoned domain expert and prevents rookie scraping or parsing errors.

### Phase 3: Execute
*   **Action**: Scan `/cone/agent/sessions/` to identify the latest session. Read the session and then proceed to execute the task.
*   **Why**: This ensures continuity of progress and protects the work from overlapping or conflicting agent operations.

### Phase 4: Validate
*   **Action**: Run compilation and linter checks (`npm run lint` or `compile_applet` / `lint_applet` tools).
*   **Why**: Ensure our strict TypeScript compilation is completely error-free before committing.

### Phase 5: Record
*   **Action**: Write or append to the current session document in `/cone/agent/sessions/`.
*   **Why**: Leave a clear, searchable trail of what you changed, why you changed it, and what next steps are required.
