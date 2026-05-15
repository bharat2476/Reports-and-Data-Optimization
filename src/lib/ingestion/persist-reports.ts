import "server-only";

import { isSupabaseConfigured } from "@/lib/env/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

import type { ReportMetadataDraft } from "@/lib/ingestion/types";
import type { LifecycleState } from "@/lib/lifecycle/types";
import { computeShadowAt } from "@/lib/lifecycle/shadow-schedule";

export type MemoryReportRow = ReportMetadataDraft & {
  id: string;
  lifecycleState: LifecycleState;
  shadowAt: string | null;
  lastShadowNoticeSentAt: string | null;
  keepOverrideUntil: string | null;
  createdAt: string;
};

const g = globalThis as unknown as {
  __biPrunerReportMetadataMemory?: Map<string, MemoryReportRow>;
};

function memoryMap(): Map<string, MemoryReportRow> {
  if (!g.__biPrunerReportMetadataMemory) {
    g.__biPrunerReportMetadataMemory = new Map();
  }
  return g.__biPrunerReportMetadataMemory;
}

function rowKey(r: { connectorId: string; externalId: string }): string {
  return `${r.connectorId}::${r.externalId}`;
}

export function memoryUpsertReportMetadata(
  row: ReportMetadataDraft,
  policy?: { inactivityThresholdDays: number },
): void {
  const key = rowKey(row);
  const existing = memoryMap().get(key);
  const id = existing?.id ?? crypto.randomUUID();
  const createdAt = existing?.createdAt ?? new Date().toISOString();
  const merged: MemoryReportRow = {
    ...row,
    id,
    createdAt,
    lifecycleState: existing?.lifecycleState ?? "active",
    shadowAt:
      policy != null
        ? computeShadowAt(row.lastAccessedAt, createdAt, policy.inactivityThresholdDays).toISOString()
        : (existing?.shadowAt ?? null),
    lastShadowNoticeSentAt: existing?.lastShadowNoticeSentAt ?? null,
    keepOverrideUntil: existing?.keepOverrideUntil ?? null,
  };
  memoryMap().set(key, merged);
}

export function memoryReportMetadataCount(): number {
  return memoryMap().size;
}

export function listMemoryReportsForOrganization(organizationId: string): MemoryReportRow[] {
  return [...memoryMap().values()].filter((r) => r.organizationId === organizationId);
}

export function getMemoryReportById(id: string): MemoryReportRow | null {
  for (const row of memoryMap().values()) {
    if (row.id === id) {
      return row;
    }
  }
  return null;
}

export function updateMemoryReportLifecycle(
  id: string,
  patch: Partial<
    Pick<
      MemoryReportRow,
      | "lifecycleState"
      | "shadowAt"
      | "lastShadowNoticeSentAt"
      | "keepOverrideUntil"
      | "lastAccessedAt"
    >
  >,
): MemoryReportRow | null {
  for (const [k, row] of memoryMap()) {
    if (row.id === id) {
      const next = { ...row, ...patch };
      memoryMap().set(k, next);
      return next;
    }
  }
  return null;
}

export async function persistReportMetadataDrafts(
  rows: ReportMetadataDraft[],
  policy?: { inactivityThresholdDays: number },
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const payload = rows.map((r) => ({
      organization_id: r.organizationId,
      connector_id: r.connectorId,
      external_id: r.externalId,
      title: r.title,
      owner_id: r.ownerId,
      owner_email: r.ownerEmail,
      last_accessed_at: r.lastAccessedAt,
      run_frequency_bucket: r.runFrequencyBucket,
      parent_report_ids: r.parentReportIds,
      definition_kind: r.definitionKind,
      definition_body: r.definitionBody,
      ast_structural_hash: r.astStructuralHash,
      raw_metadata: r.rawMetadata,
    }));

    const { error } = await supabase.from("report_metadata").upsert(payload, {
      onConflict: "connector_id,external_id",
    });

    if (error) {
      throw new Error(`report_metadata upsert failed: ${error.message}`);
    }
    return rows.length;
  }

  for (const r of rows) {
    memoryUpsertReportMetadata(r, policy);
  }
  return rows.length;
}
