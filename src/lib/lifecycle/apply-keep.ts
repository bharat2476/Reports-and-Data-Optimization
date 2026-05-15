import "server-only";

import { verifyKeepSignature } from "@/lib/lifecycle/keep-token";
import { getReportById, loadOrgPolicies, updateReportLifecycleRow } from "@/lib/lifecycle/load-reports";
import { computeShadowAt } from "@/lib/lifecycle/shadow-schedule";

export type ApplyKeepResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function applyReportKeep(params: {
  reportId: string;
  organizationId: string;
  expUnixSec: number;
  sigHex: string;
}): Promise<ApplyKeepResult> {
  const now = Date.now();
  if (params.expUnixSec * 1000 < now) {
    return { ok: false, error: "This keep link has expired.", status: 400 };
  }
  if (
    !verifyKeepSignature(params.reportId, params.organizationId, params.expUnixSec, params.sigHex)
  ) {
    return { ok: false, error: "Invalid signature.", status: 403 };
  }

  const report = await getReportById(params.reportId);
  if (!report || report.organizationId !== params.organizationId) {
    return { ok: false, error: "Report not found.", status: 404 };
  }

  const policies = await loadOrgPolicies();
  const policy = policies.find((p) => p.organizationId === report.organizationId);
  if (!policy) {
    return { ok: false, error: "Organization policy not found.", status: 500 };
  }

  const nowIso = new Date().toISOString();
  const keepMs = policy.inactivityThresholdDays * 24 * 60 * 60 * 1000;
  const keepOverrideUntil = new Date(Date.now() + keepMs).toISOString();
  const shadowAt = computeShadowAt(nowIso, nowIso, policy.inactivityThresholdDays).toISOString();

  await updateReportLifecycleRow(report.id, {
    lifecycle_state: "active",
    last_accessed_at: nowIso,
    keep_override_until: keepOverrideUntil,
    last_shadow_notice_sent_at: null,
    shadow_at: shadowAt,
  });

  return { ok: true };
}
