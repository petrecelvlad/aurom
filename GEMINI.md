# Gemini Companion (GEMINI.md)

Welcome, Gemini Agent! This companion guide is designed specifically to help you navigate our workspace efficiently, run builds cleanly, and respect our core memory architectures.

---

## 🛠️ Tech Stack & Commands

This project is a full-stack Node.js and TypeScript application:
*   **Backend**: Express + Cheerio (Scraping engine) in `/server.ts`
*   **Frontend**: React (v19) + Vite + Tailwind CSS (v4) under `/src/`
*   **Compilation / Build**:
    -   Run `npm run build` to build both client assets (Vite) and backend server bundle (`esbuild` to `dist/server.cjs`).
    -   Run `npm run dev` to start the live development server with hot-reloading.
    -   Run `npm run lint` (`tsc --noEmit`) to verify type safety.

---

## 🧭 Onboarding Sequence

Read in this order. Each step gives you a specific capability:
1.  `AGENTS.md` / `AGENT.md` (already read) — Constitution: phases, guardrails, standing rules.
2.  `cone/PHILOSOPHY.md` — Framework philosophy: what this system is and why it exists.
3.  `cone/agent/onboarding/START_HERE.md` — Framework orientation: what to read next and why.
4.  `cone/agent/onboarding/CODING_COMPANION.md` — Coding standards: naming, functions, errors, types.
5.  `cone/project/architecture/OVERVIEW.md` — System architecture: what was built and why.
6.  `cone/agent/personas/PRECIOUS_METALS_EXPERT.md` — Gold & silver domain-specific persona. Adopt immediately.

---

## 📜 Session Protocol

One conversation = one session file. Sessions serve a dual purpose: live tracking during work AND permanent archive after.
*   **Location:** `cone/agent/sessions/MM_Month/Week_N/YYYY-MM-DD/NNNN_SEMANTIC_TITLE.md`
*   **File format:** `NNNN_SEMANTIC_TITLE.md` — NNNN is a global counter, title is 2-4 words in SCREAMING_SNAKE_CASE.
*   **Before creating:** Check for `IN-PROGRESS` or `HANDOFF` status in recent sessions — continue from them, don't start fresh.
*   **Statuses:** `PLANNING` → `IN-PROGRESS` → `COMPLETE ✅` or `HANDOFF ✋`
*   **Never delete** session files — they are the project's permanent history.

---

## 🗃️ Memory & Tracking Rules

### What to Save (in `/cone/project/memory/`)
Save if ALL are true:
*   It's a behavioral correction or confirmed practice.
*   The WHY is non-obvious and not derivable from the code or docs.
*   It applies across multiple future sessions.

### What NOT to Save
*   Do not log intermediate failed builds or individual file typos.
*   Do not output full raw file dumps to the session logs; summarize edits clearly.

---

## 🔍 Navigation and Exploration

To keep your context window healthy and maintain high performance:
1.  **Read First**: Always use `view_file` to read files before attempting to write edits.
2.  **Verify Types**: Use `/src/types.ts` to see shared interfaces.
3.  **Inspect Skills**: If you are about to scrape a new provider or modify pricing, view `/cone/agent/skills/SCRAPING_AND_PARSING.md` and `/cone/agent/skills/PRICING_ENGINE.md`.
