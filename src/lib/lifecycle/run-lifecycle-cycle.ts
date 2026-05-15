import "server-only";

import { computeShadowAt, desiredLifecycleState } from "@/lib/lifecycle/shadow-schedule";
import { loadOrgPolicies, loadReportsForOrganization, updateReportLifecycleRow } from "@/lib/lifecycle/load-reports";
import type { LifecycleCycleResult, OrgLifecyclePolicy, ReportLifecycleRow } from "@/lib/lifecycle/types";
import { sendShadowStakeholderNotice } from "@/lib/notifications/shadow-notice";

function parseIso(s: string | null | undefined): Date | null {
  if (!s) {
    return null;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function processReport(
  report: ReportLifecycleRow,
  policy: OrgLifecyclePolicy,
  now: Date,
): Promise<{ stateUpdates: number; noticesSent: number }> {
  let stateUpdates = 0;
  let noticesSent = 0;

  const keepUntil = parseIso(report.keepOverrideUntil);
  const shadowAt = computeShadowAt(
    report.lastAccessedAt,
    report.createdAt,
    policy.inactivityThresholdDays,
  );
  const shadowAtIso = shadowAt.toISOString();

  const desired = desiredLifecycleState(now, shadowAt, policy.shadowNoticeDays, keepUntil);

  const patch: Parameters<typeof updateReportLifecycleRow>[1] = {};
  if (report.shadowAt !== shadowAtIso) {
    patch.shadow_at = shadowAtIso;
  }

  if (report.lifecycleState !== desired) {
    patch.lifecycle_state = desired;
    stateUpdates += 1;
    if (desired === "active") {
      patch.last_shadow_notice_sent_at = null;
    }
  }

  if (Object.keys(patch).length > 0) {
    await updateReportLifecycleRow(report.id, patch);
  }

  const lastNoticeAfter =
    patch.last_shadow_notice_sent_at === null
      ? null
      : report.lastShadowNoticeSentAt;

  const rowForNotice: ReportLifecycleRow = {
    ...report,
    lifecycleState: patch.lifecycle_state ?? report.lifecycleState,
    shadowAt: shadowAtIso,
    lastShadowNoticeSentAt: lastNoticeAfter,
  };

  if (desired === "flagged" && !rowForNotice.lastShadowNoticeSentAt) {
    await sendShadowStakeholderNotice(rowForNotice, policy);
    await updateReportLifecycleRow(report.id, { last_shadow_notice_sent_at: now.toISOString() });
    noticesSent += 1;
  }

  return { stateUpdates, noticesSent };
}

export async function runLifecycleCycle(): Promise<LifecycleCycleResult> {
  const policies = await loadOrgPolicies();
  const now = new Date();
  let reportsScanned = 0;
  let stateUpdates = 0;
  let noticesSent = 0;
  const errors: string[] = [];

  for (const policy of policies) {
    try {
      const reports = await loadReportsForOrganization(policy.organizationId);
      for (const report of reports) {
        reportsScanned += 1;
        try {
          const r = await processReport(report, policy, now);
          stateUpdates += r.stateUpdates;
          noticesSent += r.noticesSent;
        } catch (e) {
          errors.push(`report ${report.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } catch (e) {
      errors.push(`org ${policy.organizationId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { reportsScanned, stateUpdates, noticesSent, errors };
}
