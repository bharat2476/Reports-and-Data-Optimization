import "server-only";

import { isSupabaseConfigured } from "@/lib/env/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { augmentMissingTableError } from "@/lib/supabase/schema-errors";
import type { PortalOrganization } from "@/types/portal";

import * as portalStore from "./portal-store";

const DEMO_SLUG = "demo-enterprise";

function mapOrgRow(row: {
  id: string;
  name: string;
  slug: string;
  inactivity_threshold_days: number;
  shadow_notice_days: number;
  updated_at: string;
}): PortalOrganization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    inactivityThresholdDays: row.inactivity_threshold_days as PortalOrganization["inactivityThresholdDays"],
    shadowNoticeDays: row.shadow_notice_days,
    updatedAt: row.updated_at,
  };
}

export async function getOrganization(): Promise<PortalOrganization> {
  if (!isSupabaseConfigured()) {
    return portalStore.getOrganization();
  }
  const supabase = getSupabaseAdmin();

  const { count, error: countErr } = await supabase
    .from("organizations")
    .select("*", { count: "exact", head: true });

  if (countErr) {
    throw augmentMissingTableError("organizations count", countErr);
  }

  if (count && count > 0) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug, inactivity_threshold_days, shadow_notice_days, updated_at")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error) {
      throw augmentMissingTableError("organizations read", error);
    }
    return mapOrgRow(data);
  }

  const { data: inserted, error: insErr } = await supabase
    .from("organizations")
    .insert({
      name: "Demo Enterprise",
      slug: DEMO_SLUG,
      inactivity_threshold_days: 90,
      shadow_notice_days: 14,
    })
    .select("id, name, slug, inactivity_threshold_days, shadow_notice_days, updated_at")
    .single();

  if (insErr) {
    throw augmentMissingTableError("organizations seed", insErr);
  }
  return mapOrgRow(inserted);
}

export async function updateOrganization(
  patch: Partial<
    Pick<PortalOrganization, "name" | "slug" | "inactivityThresholdDays" | "shadowNoticeDays">
  >,
): Promise<PortalOrganization> {
  if (!isSupabaseConfigured()) {
    return portalStore.updateOrganization(patch);
  }
  const current = await getOrganization();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
      ...(patch.inactivityThresholdDays !== undefined
        ? { inactivity_threshold_days: patch.inactivityThresholdDays }
        : {}),
      ...(patch.shadowNoticeDays !== undefined
        ? { shadow_notice_days: patch.shadowNoticeDays }
        : {}),
    })
    .eq("id", current.id)
    .select("id, name, slug, inactivity_threshold_days, shadow_notice_days, updated_at")
    .single();

  if (error) {
    throw augmentMissingTableError("organizations update", error);
  }
  return mapOrgRow(data);
}

export async function getOrganizationIdForConnectors(): Promise<string> {
  const org = await getOrganization();
  return org.id;
}
