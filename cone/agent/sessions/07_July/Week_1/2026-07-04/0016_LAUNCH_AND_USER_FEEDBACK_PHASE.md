---
type: session
title: Cloudflare Migration, Legal Review, Public Launch, and Start of User Feedback Phase
timestamp: 2026-07-04T00:00:00Z
status: "COMPLETE ✅"
constraints:
  - Long session covering a full architecture migration and the project's public launch
  - Read this before touching anything — the project's operating phase changed
---

# Session 0016: Cloudflare Migration, Legal Review, Public Launch, and Start of User Feedback Phase

## What Changed This Session

This was the session where AUROM went from "runs on my machine" to "live product with real users." If you're picking this up cold, the single most important thing to know: **the app is published, live, and now in a user-feedback-response phase.** Read [ROADMAP.md](../../../../project/roadmap/ROADMAP.md) and [OVERVIEW.md](../../../../project/architecture/OVERVIEW.md) for current architecture — this file is the narrative of how it got here and what to watch out for, not a replacement for those.

### 1. GitHub + full Cloudflare migration
- Repo pushed to `github.com/petrecelvlad/aurom` (public).
- Consolidated the cone-lite docs (AGENT.md was a stub pointing at a nonexistent file — fixed), centralized Romanian price parsing, added Propolis headers to all source files, fixed `any`-typed catch blocks.
- Full architecture change: Express server replaced with a Cloudflare Worker. Originally built around a 1-minute Cron Trigger, but **Workers Free plan's 10ms CPU limit can't fit multiple scrapers + PDF parsing in one invocation** — this was discovered and fixed mid-session, not anticipated up front.
- **Current architecture**: `scripts/scrapeAndIngest.ts` runs under plain Node via **GitHub Actions**, once a day (`0 6 * * *` UTC — changed from an original 5-minute schedule after direct community feedback that daily is both sufficient and more polite), scrapes all providers, and `POST`s to the Worker's authenticated `/api/ingest` route. The Worker (`src/worker.ts`) only ever reads from D1 on the `/api/*` GET routes — it never scrapes. This split is the actual fix for "users never see an empty list."
- Deployed live: **`https://aurom.contact-youos.workers.dev`**. Entirely on Cloudflare's Free tier — no Paid plan needed with this design.

### 2. Legal/ethical review of the scrapers — read this before touching any scraper
- Researched actual ToS text (not just robots.txt) for all 5 dealers. **Avangard Gold and Neogold both have explicit ToS clauses that directly conflict with scraping**: Avangard prohibits automated access via scripts; Neogold explicitly names "the prices we practice" as owned content and prohibits reproducing/publishing them.
- Both were paused/mitigated at one point (Avangard's scraper unregistered; both providers' prices replaced with a "see price on site" link-out instead of the scraped number).
- **The user made an informed decision to re-enable both anyway**, accepting the risk, without ever sending the outreach emails that were drafted for this purpose. This is a conscious choice already made — don't re-litigate it or re-pause anything without being asked. The mechanism to re-apply link-out mode still exists (`PROVIDERS_LINK_OUT_ONLY` in `ProductTable.tsx`, currently `[]`) in case either dealer objects later.
- Outreach email drafts (Romanian, two variants — formal and casual) exist in the session's scratchpad but were **never sent**. If asked about this later, that's the actual state — don't assume they went out.
- Added `politeDelay()` (1-3s randomized) between sequential same-site requests in Aurom/Neogold/Tavex's scrapers, directly from real community feedback (Reddit).

### 3. Public promotion started
- Helped draft a promotional post (Romanian) announcing the platform, posted with the live URL.
- Real user feedback has started coming in and is being actively responded to (not just collected) — see the "Current Phase" section below.

## Current Phase: Responding to Real Users

This is the operating context that matters most going forward. The project is no longer in solo-build mode — there is a real, if small, live user base giving feedback, and the user (project owner) is actively replying to comments/questions. Expect requests like "help me explain X to a user" or "draft a reply to this comment" that are about **communication**, not code — don't reach for the codebase or start planning an implementation unless it's explicitly asked for. Two failure modes already happened this session that are worth naming so they don't repeat:

1. **A request to "explain the algorithm" was misread as "change the code."** The user asked for an explanation to relay to a user; an unrelated default-sort code change was made instead, deployed (well — the deploy was caught and rejected before it hit production), and had to be reverted. The user was, understandably, furious. **When the ask is about a reply/explanation for a user, do not touch code unless a code change is explicitly requested separately.**
2. **Over-hedging and over-apologizing in responses draws direct, sharp correction from this user.** Multiple corrections this session boiled down to: stop qualifying, stop re-explaining that something might not be perfect, just give the direct answer. This user wants concise, confident, correct output — not caveats layered on caveats.

## Known State Worth Knowing

- 5 scrapers active (Tavex, Aurom, Avangard, Neogold, BCR), all daily via GitHub Actions.
- D1 has `products`, `price_history`, `benchmark`, `benchmark_history` — history is written only on actual price change, not every run.
- Adaos column uses **rank-based** color spectrum (not min-max) — this was a deliberate fix mid-session because min-max compressed a clustered distribution into "everything looks green." Don't revert to min-max thinking it's simpler; it was tried and rejected for a documented reason (see the function's own comment in `ProductTable.tsx`).
- Default sort is `weight_g` ascending. A change to `sell_price_per_g_ron` was proposed and explicitly rejected/reverted this session — don't reintroduce it without being asked again.
- No custom domain yet — still on the `*.workers.dev` subdomain. Was discussed, no domain was provided by the user to wire up.
