# BI Reports & Data Optimization

🔗 **[GitHub →](https://github.com/bharat2476/Reports-and-Data-Optimization)**

---

## Why This Was Built

**Situation:** Enterprise BI environments accumulate reports faster than they are retired. Teams end up with hundreds of Looker and Tableau reports where a significant fraction are unused, semantically identical to other reports, or maintained by owners who have long since moved on. The result is query latency from redundant execution, metadata bloat across BI catalogs, and cloud compute cost with no clear owner to challenge it.

**Task:** Build a platform that connects to existing BI tools, audits what is actually being used, detects reports that are logically duplicate despite different formatting or ownership, and manages a disciplined retirement lifecycle — with stakeholder notice before anything is touched.

**Actions:** Built a SaaS platform with a secure credential vault (AES-256-GCM), asynchronous BI metadata ingestion, AST-based semantic SQL comparison that normalizes formatting before hashing, a four-state lifecycle engine (Active → Flagged → Shadow → Sunset), and an ROI dashboard that quantifies savings by latency reduction, metadata bloat, and logic consolidation.

**Result:** A working platform that turns BI sprawl from a finance and engineering complaint into a managed, measurable program — with one-click keep links for stakeholders, department-level leaderboards for accountability, and configurable thresholds so the lifecycle fits the organization rather than forcing the organization to fit the tool.

---

## Stack

**Next.js 16** (App Router) · **TypeScript** · **Tailwind CSS** · **shadcn/ui** · **Recharts** · **Supabase** (PostgreSQL) · **node-sql-parser** · **Resend** (email) · **Slack Webhooks**

---

## Key Decisions & Trade-offs

| Decision | Why | Trade-off accepted |
|---|---|---|
| **AST semantic comparison over string matching** | Two reports with identical logic but different column ordering, whitespace, or alias names will not match on a string diff; AST normalization finds logical duplicates that string comparison misses | AST parsing adds complexity and has edge cases with vendor-specific SQL dialects; BigQuery dialect is the current default |
| **AES-256-GCM encryption for vault credentials** | BI API keys and PATs are high-value secrets; encrypting ciphertext columns in Supabase means a database breach does not expose live credentials | Vault key rotation requires re-encrypting all connector records; must be planned as an operational event |
| **Secrets never returned to the browser** | Credential validation happens server-side; the portal confirms connectivity status, never the credential itself | Requires server-side API routes for all vault operations; client components cannot call Supabase directly for connector data |
| **Four-state lifecycle (Active → Flagged → Shadow → Sunset)** | A binary active/deleted model creates stakeholder anxiety and accidental deletions; the shadow state gives owners a window to intervene before anything is removed | More states mean more lifecycle logic and more notification events to manage |
| **One-click keep links (HMAC-signed)** | Stakeholders should not need to log into a portal to extend a report's lifecycle; a signed link in an email or Slack message is sufficient | HMAC secret rotation invalidates outstanding keep links; must be coordinated with active shadow notices |
| **Inactivity thresholds configurable per org (30–360 days)** | A financial reporting team's "inactive" threshold is very different from a growth team's; hard-coding a number would make the platform wrong for most use cases | More configuration surface requires clear UX to prevent orgs from setting thresholds that defeat the purpose |
| **Workers as CLI entrypoints (not embedded in the API)** | Ingestion and lifecycle jobs are long-running and should be triggered on a schedule, not on request; decoupling them from the API makes them independently operable and avoids request timeout limits | Workers must be orchestrated externally (cron, Vercel cron jobs, etc.); not self-scheduling out of the box |

---

## What It Does

| Capability | Description |
|------------|-------------|
| **Connection portal** | Admins register their organization and add Looker or Tableau connectors (server URL, optional project/site metadata) |
| **The Vault** | API credentials are validated against each vendor and stored with AES-256-GCM encryption in Supabase (`bi_connectors` ciphertext columns); secrets are never returned to the browser |
| **Asynchronous ingestion** | A worker polls BI APIs for usage metadata (last accessed, owner, dependencies) and logic definitions (SQL, LookML, or Tableau XML stubs), then upserts `report_metadata` |
| **AST semantic comparison** | Report SQL is parsed into an AST, normalized (column order, commutative operations), and hashed — logically identical queries match regardless of formatting differences |
| **Lifecycle management** | State machine: Active → Flagged → Shadow → Sunset, driven by configurable inactivity thresholds; stakeholders receive Email/Slack notice before shadow with a one-click keep link to extend activity |
| **ROI dashboard** | Estimated savings, metadata bloat reduction, latency model, logic consolidation score, lifecycle charts, and a department leaderboard by owner email domain |

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Next.js portal │────▶│  API routes      │────▶│  Supabase       │
│  /portal/*      │     │  + Vault crypto  │     │  PostgreSQL     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                        │
         │                        ▼
         │               ┌──────────────────┐
         └──────────────▶│  Workers (CLI)   │
                         │  ingest · lifecycle│
                         └──────────────────┘
                                  │
                                  ▼
                         Looker API 4.0 / Tableau REST
```

**Global:** Next.js portal and API routes handle all credential management, lifecycle state, and dashboard rendering.

**Workers:** `ingest.ts` and `lifecycle.ts` run on a schedule (cron or HTTP trigger). They poll BI vendor APIs, upsert report metadata, advance lifecycle states, and dispatch stakeholder notifications. Decoupled from the API to avoid request timeout limits on long-running jobs.

**Vault:** All connector credentials pass through AES-256-GCM encryption before reaching Supabase. Server env only — the vault key never touches the browser.

---

## Project Structure

```
├── src/
│   ├── app/portal/          # Admin UI — overview, connectors, settings, ROI
│   ├── app/api/             # Portal + worker + public keep-link API routes
│   ├── lib/
│   │   ├── portal/          # Org and connector services
│   │   ├── vault/           # AES-GCM encryption, connection validation
│   │   ├── ingestion/       # Looker / Tableau fetch and persist
│   │   ├── lifecycle/       # Shadow schedule, keep tokens, lifecycle job
│   │   ├── roi/             # Dashboard metrics and scoring
│   │   └── parser/          # sql-compare.ts — structural hash generation
│   └── worker/              # ingest.ts, lifecycle.ts — CLI entrypoints
├── supabase/
│   ├── migrations/          # Incremental SQL migrations
│   └── apply_full_schema.sql  # One-shot schema for Supabase SQL Editor
├── mock_metadata.json       # 10 sample Looker reports (2 logical duplicates)
└── .env.example             # Environment variable template
```

---

## What This Demonstrates — And What It Intentionally Omits

| What this demonstrates | What it intentionally omits |
|---|---|
| Credential security design: AES-256-GCM vault with server-only key handling | Production key rotation tooling and automated re-encryption workflows |
| AST-based semantic deduplication across SQL dialects | Full multi-dialect support — BigQuery is the current default; other dialects have known edge cases |
| Lifecycle state machine with stakeholder-friendly intervention (one-click keep) | Automated Looker/Tableau deletion via API — sunset is flagged, not executed automatically |
| Configurable inactivity thresholds per organization | ML-based threshold recommendation based on org usage patterns |
| ROI quantification: latency, bloat, and consolidation scoring | Integration with cloud billing APIs for verified cost attribution |

---

## Prerequisites

- **Node.js** 20+
- **npm**
- **Supabase** project (optional for local dev — app falls back to in-memory stores without DB)
- **Looker** API3 credentials and/or **Tableau** Personal Access Token for live connector tests

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — server only |
| `BI_PRUNER_VAULT_KEY` | 32-byte AES key (64-char hex or base64); required in production |
| `BI_PRUNER_VAULT_DEV_PHRASE` | Local dev fallback when vault key is not set |
| `WORKER_CRON_SECRET` | Protects `POST /api/internal/worker/*` |
| `REPORT_KEEP_HMAC_SECRET` | Signs one-click keep links |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Optional — shadow notice email via Resend |
| `SLACK_WEBHOOK_URL` | Optional — shadow notice via Slack |

Never commit `.env.local`. Store `SUPABASE_SERVICE_ROLE_KEY` and `BI_PRUNER_VAULT_KEY` only in server environment — never in client-side code or browser-accessible routes.

### 3. Database schema

In the Supabase **SQL Editor**, run once:

```sql
-- supabase/apply_full_schema.sql
```

Creates `organizations`, `bi_connectors`, `report_metadata`, triggers, and lifecycle columns.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Open admin portal** → `/portal`

---

## Background Workers

Workers run on a schedule (cron) or are triggered manually. They are intentionally decoupled from the API to handle long-running BI API polling without request timeout constraints.

**Run manually:**

```bash
# Pull usage + definitions from valid connectors into report_metadata
npm run worker:ingest

# Advance lifecycle states and send pre-shadow notices
npm run worker:lifecycle
```

**HTTP trigger** (requires `WORKER_CRON_SECRET` header):

```http
POST /api/internal/worker/ingest
POST /api/internal/worker/lifecycle
x-bi-pruner-worker-secret: <WORKER_CRON_SECRET>
```

---

## Testing the AST Parser

`mock_metadata.json` contains 10 mock Looker reports. Reports `look:201` and `look:202` contain the same logic with different SQL formatting — they should produce the **same structural hash**, demonstrating that the AST normalizer catches logical duplicates that string matching would miss.

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

Expected output: `match: true`

---

## Portal Routes

| Route | Description |
|-------|-------------|
| `/` | Product landing page |
| `/portal` | Organization overview |
| `/portal/connectors` | Register and manage Looker / Tableau connectors |
| `/portal/settings` | Organization name, slug, inactivity thresholds, notice windows |
| `/portal/roi` | ROI and performance dashboard |

---

## Security Notes

- **Vault key and service role key** belong only in server environment variables — never in client-side code or exposed through API routes
- **Rotate any credential** that was pasted into a chat, committed to version control, or shared outside a secrets manager
- **Least-privilege BI access** — issue Looker API3 keys and Tableau PATs with read-only scope; the platform validates connectivity but cannot enforce vendor-side permissions
- **HMAC key rotation** invalidates all outstanding keep links — coordinate rotation with any active shadow-notice window

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run worker:ingest` | BI metadata ingestion cycle |
| `npm run worker:lifecycle` | Lifecycle advancement + notification cycle |

---

## Interview Framing

### The core product insight

BI sprawl is not a storage problem — it is a **coordination problem**. Reports accumulate because deleting them requires knowing whether anyone still depends on them, and that knowledge is distributed across dozens of teams. This platform centralizes the observability (who uses what, how often) and the coordination (shadow notices, keep links, department leaderboards) so that retirement decisions can be made confidently rather than avoided indefinitely.

### Key trade-offs for discussion

- **AST normalization vs. embedding-based similarity** — AST structural hashing is deterministic and explainable; embedding cosine similarity would catch more semantic near-duplicates but introduces a threshold tuning problem and a black-box result. For a trust-sensitive operation like report retirement, explainability wins.
- **Shadow state vs. immediate deletion** — the shadow state adds operational complexity but dramatically reduces stakeholder resistance, which is the primary reason BI cleanup programs fail in practice.
- **Configurable thresholds vs. ML-recommended thresholds** — shipping configurable thresholds first lets the platform work immediately without training data; ML recommendation is a natural v2 once usage logs accumulate.
- **Workers as CLI vs. embedded job runners** — decoupled workers are easier to debug, easier to scale independently, and don't couple the API's availability to the ingestion job's completion. The trade-off is requiring external cron orchestration.

---

## License

Private / all rights reserved unless otherwise specified by the repository owner.
