import "server-only";

import type { OrgLifecyclePolicy } from "@/lib/lifecycle/types";
import type { ReportLifecycleRow } from "@/lib/lifecycle/types";
import { defaultKeepLinkExpirySec, signKeepPayload } from "@/lib/lifecycle/keep-token";

function appBaseUrl(): string {
  const explicit = process.env.PUBLIC_APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/+$/, "")}`;
  }
  return "http://localhost:3000";
}

export function buildReportKeepUrl(report: ReportLifecycleRow): string {
  const exp = Math.floor(Date.now() / 1000) + defaultKeepLinkExpirySec();
  const sig = signKeepPayload(report.id, report.organizationId, exp);
  const base = appBaseUrl();
  const q = new URLSearchParams({
    rid: report.id,
    oid: report.organizationId,
    exp: String(exp),
    sig,
  });
  return `${base}/api/public/report-keep?${q.toString()}`;
}

async function postJson(url: string, body: unknown, headers: Record<string, string>): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 400)}`);
  }
}

export async function sendShadowNoticeEmail(
  report: ReportLifecycleRow,
  policy: OrgLifecyclePolicy,
): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = report.ownerEmail?.trim();
  if (!key || !from || !to) {
    console.warn(
      `[bi-pruner] Shadow notice (email skipped: set RESEND_API_KEY, RESEND_FROM_EMAIL, and report owner_email). Report ${report.id} "${report.title ?? report.externalId}"`,
    );
    return;
  }
  const keepUrl = buildReportKeepUrl(report);
  const shadowAt = report.shadowAt ? new Date(report.shadowAt).toISOString() : "scheduled";
  await postJson(
    "https://api.resend.com/emails",
    {
      from,
      to: [to],
      subject: `[BI-Pruner] Report entering shadow soon: ${report.title ?? report.externalId}`,
      html: `<p>This report is scheduled to move to <strong>Shadow</strong> after <strong>${shadowAt}</strong> (UTC), per your organization idle policy (${policy.inactivityThresholdDays} days).</p><p><a href="${keepUrl}">Keep this report active</a> (one click, expires automatically).</p>`,
    },
    { Authorization: `Bearer ${key}` },
  );
}

export async function sendShadowNoticeSlack(report: ReportLifecycleRow): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!url) {
    return;
  }
  const keepUrl = buildReportKeepUrl(report);
  const text = `*BI-Pruner* — report "${report.title ?? report.externalId}" (${report.externalId}) will move to *Shadow* after ${report.shadowAt ?? "TBD"}. <${keepUrl}|Keep active>`;
  await postJson(url, { text }, {});
}

export async function sendShadowStakeholderNotice(
  report: ReportLifecycleRow,
  policy: OrgLifecyclePolicy,
): Promise<void> {
  await sendShadowNoticeSlack(report);
  await sendShadowNoticeEmail(report, policy);
}
