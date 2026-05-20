# BI Reports and Data Optimization

**BI-Reports & Data Optimization** is a SaaS platform for **BI observability** and **technical debt mitigation**. It connects to enterprise BI tools (Looker, Tableau), audits report usage and definitions, detects semantically duplicate logic, and manages a disciplined report lifecycle so teams reduce latency, metadata bloat, and cloud cost.

Repository: [github.com/bharat2476/Reports-and-Data-Optimization](https://github.com/bharat2476/Reports-and-Data-Optimization)

---

## What it does

| Capability | Description |
|------------|-------------|
| **Connection portal** | Admins register the organization and add **Looker** or **Tableau** connectors (server URL, optional project/site metadata). |
| **The Vault** | API credentials are validated against each vendor, then stored with **AES-256-GCM** encryption in Supabase (`bi_connectors` ciphertext columns). Secrets are never returned to the browser. |
| **Asynchronous ingestion** | A worker polls BI APIs for usage metadata (last accessed, owner, dependencies) and logic definitions (SQL, LookML, or Tableau XML stubs), then upserts **`report_metadata`**. |
| **AST semantic comparison** | Report SQL is parsed into an AST, normalized (column order, commutative ops), and hashed so logically identical queries match despite formatting differences. |
| **Lifecycle management** | State machine: **Active → Flagged → Shadow → Sunset**, driven by configurable inactivity thresholds (30–360 days). Stakeholders get **Email/Slack** notice before shadow; **one-click keep** links extend activity. |
| **ROI dashboard** | Estimated savings, metadata bloat reduction, latency model, logic consolidation score, lifecycle charts, and a department leaderboard (by owner email domain). |

---

## Architecture (high level)

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Next.js portal │────▶│  API routes      │────▶│  Supabase       │
│  /portal/*      │     │  + Vault crypto  │     │  PostgreSQL     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                        │
         │                        ▼
         │               ┌──────────────────┐
         └──────────────▶│  Workers (CLI)   │
                         │  ingest, lifecycle│
                         └──────────────────┘
                                  │
                                  ▼
                         Looker API 4.0 / Tableau REST
```

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Recharts, Supabase, `node-sql-parser`.

---

## Project structure

```text
├── src/
│   ├── app/portal/          # Admin UI (overview, connectors, settings, ROI)
│   ├── app/api/               # Portal + worker + public keep-link APIs
│   ├── lib/
│   │   ├── portal/            # Org/connector services
│   │   ├── vault/             # AES-GCM, connection validation
│   │   ├── ingestion/         # Looker/Tableau fetch + persist
│   │   ├── lifecycle/         # Shadow schedule, keep tokens, cycle job
│   │   ├── roi/               # Dashboard metrics
│   │   └── parser/            # sql-compare.ts (structural hashes)
│   └── worker/                # ingest.ts, lifecycle.ts (CLI entrypoints)
├── supabase/
│   ├── migrations/            # Incremental SQL migrations
│   └── apply_full_schema.sql  # One-shot script for SQL Editor
├── mock_metadata.json         # 10 sample Looker reports (2 logical duplicates)
└── .env.example               # Environment variable template
```

---

## Prerequisites

- **Node.js** 20+
- **npm**
- **Supabase** project (optional for local dev without DB — app falls back to in-memory stores)
- **Looker** API3 credentials and/or **Tableau** Personal Access Token for real connector tests

---

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy the template and fill in values (never commit `.env.local`):

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `BI_PRUNER_VAULT_KEY` | 32-byte AES key (64-char hex or base64); required in production |
| `BI_PRUNER_VAULT_DEV_PHRASE` | Local dev fallback if vault key not set |
| `WORKER_CRON_SECRET` | Protects `POST /api/internal/worker/*` |
| `REPORT_KEEP_HMAC_SECRET` | Signs one-click keep links |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Optional shadow notice email |
| `SLACK_WEBHOOK_URL` | Optional shadow notice Slack |

### 3. Database schema (Supabase)

In the Supabase **SQL Editor**, run the full script once:

**`supabase/apply_full_schema.sql`**

Creates `organizations`, `bi_connectors`, `report_metadata`, triggers, and lifecycle columns.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Open admin portal** → `/portal`.

---

## Background workers

Run on a schedule (cron) or manually:

```bash
# Pull usage + definitions from valid connectors into report_metadata
npm run worker:ingest

# Advance lifecycle states and send pre-shadow notices
npm run worker:lifecycle
```

HTTP triggers (same secret header):

```http
POST /api/internal/worker/ingest
POST /api/internal/worker/lifecycle
x-bi-pruner-worker-secret: <WORKER_CRON_SECRET>
```

---

## Testing the AST parser

`mock_metadata.json` contains **10** mock Looker reports. **`look:201`** and **`look:202`** use the same logic with different SQL formatting; they should produce the **same structural hash**.

```bash
npx tsx -e "
import { readFileSync } from 'fs';
import { structuralHashFromSql } from './src/parser/sql-compare.ts';
const j = JSON.parse(readFileSync('./mock_metadata.json','utf8'));
const a = j.looker_reports.find(r => r.external_id === 'look:201').sql;
const b = j.looker_reports.find(r => r.external_id === 'look:202').sql;
const ha = structuralHashFromSql(a, 'bigquery');
const hb = structuralHashFromSql(b, 'bigquery');
console.log('match:', ha.ok && hb.ok && ha.structuralHash === hb.structuralHash);
"
```

---

## Portal routes

| Route | Description |
|-------|-------------|
| `/` | Product landing |
| `/portal` | Overview |
| `/portal/connectors` | Register Looker/Tableau connectors |
| `/portal/settings` | Organization name, slug, inactivity & notice thresholds |
| `/portal/roi` | ROI & performance dashboard |

---

## Security notes

- Store **service role** and **vault** keys only in server env (`.env.local`, deployment secrets).
- Rotate any credential that was ever pasted into chat or committed by mistake.
- Read-only BI access should be enforced when issuing Looker API3 keys and Tableau PATs; the app validates connectivity but cannot cryptographically prove least privilege.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run worker:ingest` | BI metadata ingestion cycle |
| `npm run worker:lifecycle` | Lifecycle + notification cycle |

---

## License

Private / all rights reserved unless otherwise specified by the repository owner.
