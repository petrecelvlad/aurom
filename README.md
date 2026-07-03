# AUROM

Real-time precious metals (gold, silver, platinum) price aggregator for the Romanian market. Compares physical bullion prices across major local dealers (Tavex, Aurom, Avangard, BCR, Neogold) against the live National Bank of Romania (BNR) gold benchmark, ranked by markup ("Adaos").

## Architecture

A Cloudflare Worker runs on two schedules:
- **`scheduled`** (Cron Trigger, every 1 minute) — scrapes all 5 dealers plus the BNR benchmark, persists the result to D1.
- **`fetch`** (Hono) — serves `/api/scrape/all` and `/api/benchmark/gold`, both pure reads against the last D1 snapshot. It never scrapes on request.

The React SPA is served from the same Worker via Workers Static Assets. See [`cone/project/architecture/OVERVIEW.md`](cone/project/architecture/OVERVIEW.md) for the full breakdown, and [`AGENT.md`](AGENT.md) for the project's standing rules if you're an AI agent working on this codebase.

## Run Locally

**Prerequisites:** Node.js, a Cloudflare account, `wrangler` authenticated (`npx wrangler login`).

```bash
npm install
npm run dev
```

This builds the frontend once and starts `wrangler dev` (local Worker + local D1 + local static assets). The scheduled handler doesn't fire automatically in local dev — trigger it manually:

```bash
curl http://127.0.0.1:8788/cdn-cgi/handler/scheduled
```

(port may differ — `wrangler dev` prints it on startup)

## Deploy

```bash
npm run deploy
```

Requires a D1 database already created and migrated (`wrangler d1 create aurom-db`, `wrangler d1 migrations apply aurom-db --remote`) and its `database_id` set in `wrangler.jsonc`. The 1-minute cron cadence needs the Workers Paid plan for sufficient CPU budget.

## Other Commands

- `npm run build` — build frontend assets only.
- `npm run lint` — type-check (`tsc --noEmit`).
- `npm run cf-typegen` — regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc` bindings.
