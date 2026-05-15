import "server-only";

import { isSupabaseConfigured } from "@/lib/env/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { MemoryReportRow } from "@/lib/ingestion/persist-reports";
import { getMemoryReportById, listMemoryReportsForOrganization, updateMemoryReportLifecycle } from "@/lib/ingestion/persist-reports";
import type { OrgLifecyclePolicy, ReportLifecycleRow, LifecycleState } from "@/lib/lifecycle/types";

function memoryToRow(m: MemoryReportRow): ReportLifecycleRow {
  return {
    id: m.id,
    organizationId: m.organizationId,
    connectorId: m.connectorId,
    externalId: m.externalId,
    title: m.title,
    ownerEmail: m.ownerEmail,
    lastAccessedAt: m.lastAccessedAt,
    createdAt: m.createdAt,
    lifecycleState: m.lifecycleState,
    shadowAt: m.shadowAt,
    lastShadowNoticeSentAt: m.lastShadowNoticeSentAt,
    keepOverrideUntil: m.keepOverrideUntil,
  };
}

function mapRow(r: {
  id: string;
  organization_id: string;
  connector_id: string;
  external_id: string;
  title: string | null;
  owner_email: string | null;
  last_accessed_at: string | null;
  created_at: string;
  lifecycle_state: string;
  shadow_at: string | null;
  last_shadow_notice_sent_at: string | null;
  keep_override_until: string | null;
}): ReportLifecycleRow {
  return {
    id: r.id,
    organizationId: r.organization_id,
    connectorId: r.connector_id,
    externalId: r.external_id,
    title: r.title,
    ownerEmail: r.owner_email,
    lastAccessedAt: r.last_accessed_at,
    createdAt: r.created_at,
    lifecycleState: r.lifecycle_state as LifecycleState,
    shadowAt: r.shadow_at,
    lastShadowNoticeSentAt: r.last_shadow_notice_sent_at,
    keepOverrideUntil: r.keep_override_until,
  };
}

export async function loadOrgPolicies(): Promise<OrgLifecyclePolicy[]> {
  if (!isSupabaseConfigured()) {
    const { getOrganization } = await import("@/lib/portal/organization-service");
    const o = await getOrganization();
    return [
      {
        organizationId: o.id,
        inactivityThresholdDays: o.inactivityThresholdDays,
        shadowNoticeDays: o.shadowNoticeDays,
      },
    ];
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, inactivity_threshold_days, shadow_notice_days");

  if (error) {
    throw new Error(`organizations policy load failed: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    organizationId: row.id,
    inactivityThresholdDays: row.inactivity_threshold_days,
    shadowNoticeDays: row.shadow_notice_days,
  }));
}

export async function loadReportsForOrganization(orgId: string): Promise<ReportLifecycleRow[]> {
  if (!isSupabaseConfigured()) {
    return listMemoryReportsForOrganization(orgId).map(memoryToRow);
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("report_metadata")
    .select(
      "id, organization_id, connector_id, external_id, title, owner_email, last_accessed_at, created_at, lifecycle_state, shadow_at, last_shadow_notice_sent_at, keep_override_until",
    )
    .eq("organization_id", orgId)
    .neq("lifecycle_state", "sunset");

  if (error) {
    throw new Error(`report_metadata load failed: ${error.message}`);
  }
  return (data ?? []).map(mapRow);
}

export async function updateReportLifecycleRow(
  id: string,
  patch: Partial<{
    lifecycle_state: LifecycleState;
    shadow_at: string | null;
    last_shadow_notice_sent_at: string | null;
    keep_override_until: string | null;
    last_accessed_at: string | null;
  }>,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const mem: Parameters<typeof updateMemoryReportLifecycle>[1] = {};
    if (patch.lifecycle_state !== undefined) {
      mem.lifecycleState = patch.lifecycle_state;
    }
    if (patch.shadow_at !== undefined) {
      mem.shadowAt = patch.shadow_at;
    }
    if (patch.last_shadow_notice_sent_at !== undefined) {
      mem.lastShadowNoticeSentAt = patch.last_shadow_notice_sent_at;
    }
    if (patch.keep_override_until !== undefined) {
      mem.keepOverrideUntil = patch.keep_override_until;
    }
    if (patch.last_accessed_at !== undefined) {
      mem.lastAccessedAt = patch.last_accessed_at;
    }
    if (Object.keys(mem).length > 0) {
      updateMemoryReportLifecycle(id, mem);
    }
    return;
  }
  const supabase = getSupabaseAdmin();
  if (Object.keys(patch).length === 0) {
    return;
  }
  const { error } = await supabase.from("report_metadata").update(patch).eq("id", id);
  if (error) {
    throw new Error(`report_metadata update failed: ${error.message}`);
  }
}

export async function getReportById(id: string): Promise<ReportLifecycleRow | null> {
  if (!isSupabaseConfigured()) {
    const m = getMemoryReportById(id);
    return m ? memoryToRow(m) : null;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("report_metadata")
    .select(
      "id, organization_id, connector_id, external_id, title, owner_email, last_accessed_at, created_at, lifecycle_state, shadow_at, last_shadow_notice_sent_at, keep_override_until",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`report_metadata read failed: ${error.message}`);
  }
  return data ? mapRow(data) : null;
}
