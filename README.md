# AUROM

Real-time precious metals (gold, silver, platinum) price aggregator for the Romanian market. Compares physical bullion prices across major local dealers (Tavex, Aurom, Avangard, BCR, Neogold) against the live National Bank of Romania (BNR) gold benchmark, ranked by markup ("Adaos").

## Architecture

Two separate pieces, connected only through D1 and one authenticated HTTP call:
- **Scraper** (`scripts/scrapeAndIngest.ts`) — runs under plain Node via GitHub Actions (`.github/workflows/scrape.yml`) roughly every 5 minutes, scrapes all 5 dealers plus the BNR benchmark, `POST`s the result to the Worker.
- **Cloudflare Worker** (`src/worker.ts`, Hono) — `GET /api/scrape/all` and `GET /api/benchmark/gold` are pure reads against the last D1 snapshot (never scrapes on request); `POST /api/ingest` is the only thing that writes, authenticated by a shared secret.

The scraper runs outside Cloudflare on purpose: Workers Free plan caps an invocation at 10ms of CPU time, and parsing ~15 dealer pages plus a PDF doesn't fit in that regardless of how the work is split. GitHub Actions has no such limit and is free on this public repo.

The React SPA is served from the same Worker via Workers Static Assets. See [`cone/project/architecture/OVERVIEW.md`](cone/project/architecture/OVERVIEW.md) for the full breakdown, and [`AGENT.md`](AGENT.md) for the project's standing rules if you're an AI agent working on this codebase.

## Run Locally

**Prerequisites:** Node.js, a Cloudflare account, `wrangler` authenticated (`npx wrangler login`).

```bash
npm install
npm run dev
```

This builds the frontend once and starts `wrangler dev` (local Worker + local D1 + local static assets). Create a `.dev.vars` file with `INGEST_SECRET=<anything>` first. To manually run a scrape against your local dev server:

```bash
WORKER_URL=http://127.0.0.1:8788 INGEST_SECRET=<same value as .dev.vars> npm run scrape
```

(port may differ — `wrangler dev` prints it on startup)

## Deploy

```bash
npm run deploy
wrangler secret put INGEST_SECRET
```

Requires a D1 database already created and migrated (`wrangler d1 create aurom-db`, `wrangler d1 migrations apply aurom-db --remote`) and its `database_id` set in `wrangler.jsonc`. After deploying, set `WORKER_URL` and `INGEST_SECRET` (same value as the Worker secret) as GitHub repository secrets so `.github/workflows/scrape.yml` can reach it. No paid plan needed — this design fits comfortably on Cloudflare's Free tier.

## Other Commands

- `npm run build` — build frontend assets only.
- `npm run lint` — type-check (`tsc --noEmit`).
- `npm run cf-typegen` — regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc` bindings.
- `npm run scrape` — manually run the scraper and ingest once (needs `WORKER_URL` and `INGEST_SECRET` env vars).
