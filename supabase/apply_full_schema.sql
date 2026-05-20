-- BI Reports and Data Optimization: full schema for Supabase SQL Editor (run once on a new project).
-- Source: supabase/migrations/20250514160000_initial_bi_pruner.sql
--         supabase/migrations/20250514170000_lifecycle_columns.sql

-- BI Reports and Data Optimization: core metadata schema (Supabase / PostgreSQL)
-- Organizations, encrypted BI connectors, and ingested report metadata.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Organizations (tenants)
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  -- Admin-configurable inactivity window before a report is considered stale.
  inactivity_threshold_days integer not null default 90
    check (inactivity_threshold_days in (30, 60, 90, 180, 360)),
  -- Days before shadow mode when stakeholders are notified.
  shadow_notice_days integer not null default 14
    check (shadow_notice_days > 0 and shadow_notice_days <= 90),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_slug_idx on public.organizations (slug);

-- ---------------------------------------------------------------------------
-- BI connectors (Looker / Tableau) — credentials live in the Vault columns
-- ---------------------------------------------------------------------------
create table if not exists public.bi_connectors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  connector_type text not null check (connector_type in ('looker', 'tableau')),
  display_name text not null,
  -- AES-256-GCM payload (client id/secret, tokens, etc.) — never store plaintext.
  credential_ciphertext bytea not null,
  credential_iv bytea not null,
  credential_auth_tag bytea,
  credential_key_version text not null default 'v1',
  connection_status text not null default 'pending'
    check (connection_status in ('pending', 'valid', 'invalid')),
  last_validated_at timestamptz,
  validation_error text,
  -- Optional non-secret metadata (instance host, site id, project id, …)
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, connector_type, display_name)
);

create index if not exists bi_connectors_org_idx on public.bi_connectors (organization_id);
create index if not exists bi_connectors_status_idx on public.bi_connectors (connection_status);

-- ---------------------------------------------------------------------------
-- Report / asset metadata (usage + definitions + lifecycle)
-- ---------------------------------------------------------------------------
create table if not exists public.report_metadata (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  connector_id uuid not null references public.bi_connectors (id) on delete cascade,
  external_id text not null,
  title text,
  owner_id text,
  owner_email text,
  last_accessed_at timestamptz,
  -- Coarse run frequency as reported by the BI tool (exact semantics per connector).
  run_frequency_bucket text,
  parent_report_ids text[] not null default '{}'::text[],
  definition_kind text check (definition_kind in ('sql', 'lookml', 'tableau_xml')),
  definition_body text,
  -- Structural hash from src/parser/sql-compare (or future LookML/XML canonicalizers).
  ast_structural_hash text,
  lifecycle_state text not null default 'active'
    check (lifecycle_state in ('active', 'flagged', 'shadow', 'sunset')),
  -- Raw usage / lineage / folder path / URL / permissions snapshot.
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connector_id, external_id)
);

create index if not exists report_metadata_org_idx on public.report_metadata (organization_id);
create index if not exists report_metadata_connector_idx on public.report_metadata (connector_id);
create index if not exists report_metadata_lifecycle_idx on public.report_metadata (lifecycle_state);
create index if not exists report_metadata_last_access_idx on public.report_metadata (last_accessed_at);
create index if not exists report_metadata_ast_hash_idx on public.report_metadata (ast_structural_hash);

-- Keep updated_at in sync (simple trigger pattern).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists bi_connectors_set_updated_at on public.bi_connectors;
create trigger bi_connectors_set_updated_at
  before update on public.bi_connectors
  for each row execute function public.set_updated_at();

drop trigger if exists report_metadata_set_updated_at on public.report_metadata;
create trigger report_metadata_set_updated_at
  before update on public.report_metadata
  for each row execute function public.set_updated_at();

comment on table public.organizations is 'SaaS tenants / enterprise customers.';
comment on table public.bi_connectors is 'Registered BI integrations; secrets stored encrypted (Vault).';
comment on table public.report_metadata is 'Ingested dashboards/looks/workbooks with usage and lifecycle.';

-- Lifecycle: shadow scheduling, notice idempotency, keep bypass window.

alter table public.report_metadata
  add column if not exists shadow_at timestamptz;

alter table public.report_metadata
  add column if not exists last_shadow_notice_sent_at timestamptz;

alter table public.report_metadata
  add column if not exists keep_override_until timestamptz;

comment on column public.report_metadata.shadow_at is
  'UTC instant when the asset becomes eligible for Shadow (typically reference_activity + inactivity_threshold).';
comment on column public.report_metadata.last_shadow_notice_sent_at is
  'Last time a pre-shadow stakeholder notice was sent (idempotency).';
comment on column public.report_metadata.keep_override_until is
  'After a one-click keep, defer automated shadow until this instant.';

create index if not exists report_metadata_shadow_at_idx
  on public.report_metadata (shadow_at)
  where shadow_at is not null;
