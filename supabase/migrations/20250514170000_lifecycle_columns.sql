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
