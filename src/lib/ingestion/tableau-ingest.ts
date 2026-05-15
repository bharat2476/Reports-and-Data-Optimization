import { tableauRestApiVersion } from "@/lib/env/server";

import type { LoadedConnector, ReportMetadataDraft } from "./types";

const FETCH_MS = 45_000;

function normalizeBaseUrl(url: string): string {
  const u = url.trim().replace(/\/+$/, "");
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    return `https://${u}`;
  }
  return u;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseTableauAuth(xml: string): { token: string; siteId: string } | null {
  const tokenM = xml.match(/token\s*=\s*["']([^"']+)["']/i);
  const siteM = xml.match(/<site[^>]*\bid\s*=\s*["']([^"']+)["']/i);
  if (!tokenM?.[1] || !siteM?.[1]) {
    return null;
  }
  return { token: tokenM[1], siteId: siteM[1] };
}

function maxViews(): number {
  const raw = process.env.INGEST_TABLEAU_MAX_VIEWS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 500;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10000) : 500;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function viewsFromJson(json: unknown): Array<Record<string, unknown>> {
  if (!json || typeof json !== "object") {
    return [];
  }
  const j = json as Record<string, unknown>;
  const views = j.views as Record<string, unknown> | undefined;
  if (!views) {
    return [];
  }
  const v = views.view;
  if (Array.isArray(v)) {
    return v as Array<Record<string, unknown>>;
  }
  if (v && typeof v === "object") {
    return [v as Record<string, unknown>];
  }
  return [];
}

export async function ingestTableau(ctx: LoadedConnector): Promise<ReportMetadataDraft[]> {
  if (ctx.credentials.kind !== "tableau") {
    throw new Error("Tableau connector expected");
  }
  const root = normalizeBaseUrl(ctx.metadata.baseUrl ?? "");
  const version = tableauRestApiVersion();
  const siteContentUrl = (ctx.metadata.siteName ?? "").trim();
  const signinUrl = `${root}/api/${version}/auth/signin`;
  const body = `<?xml version='1.0' encoding='UTF-8' ?><tsRequest><credentials personalAccessTokenName="${escapeXml(
    ctx.credentials.patName,
  )}" personalAccessTokenSecret="${escapeXml(ctx.credentials.patSecret)}" ><site contentUrl="${escapeXml(
    siteContentUrl,
  )}" /></credentials></tsRequest>`;

  const res = await fetchWithTimeout(signinUrl, {
    method: "POST",
    headers: { "Content-Type": "application/xml", Accept: "application/xml" },
    body,
  });
  const xml = await res.text();
  if (!res.ok) {
    throw new Error(`Tableau sign-in failed (${res.status}): ${xml.slice(0, 500)}`);
  }
  const auth = parseTableauAuth(xml);
  if (!auth) {
    throw new Error("Tableau sign-in response missing token or site id");
  }

  const drafts: ReportMetadataDraft[] = [];
  const pageSize = 100;
  let page = 1;
  const cap = maxViews();

  while (drafts.length < cap) {
    const url = `${root}/api/${version}/sites/${encodeURIComponent(auth.siteId)}/views?pageSize=${pageSize}&pageNumber=${page}`;
    const vres = await fetchWithTimeout(url, {
      headers: {
        Accept: "application/json",
        "X-Tableau-Auth": auth.token,
      },
    });
    const text = await vres.text();
    if (!vres.ok) {
      throw new Error(`Tableau views list failed (${vres.status}): ${text.slice(0, 500)}`);
    }
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      throw new Error("Tableau views response was not JSON; enable JSON responses on the server.");
    }
    const views = viewsFromJson(json);
    if (views.length === 0) {
      break;
    }
    for (const v of views) {
      if (drafts.length >= cap) {
        break;
      }
      const id = v.id != null ? String(v.id) : null;
      if (!id) {
        continue;
      }
      const name = typeof v.name === "string" ? v.name : null;
      const updatedAt =
        typeof v.updatedAt === "string"
          ? v.updatedAt
          : typeof (v as { updated_at?: string }).updated_at === "string"
            ? (v as { updated_at?: string }).updated_at!
            : null;
      const owner = v.owner as { id?: string; name?: string; email?: string } | undefined;
      const workbook = v.workbook as { id?: string; name?: string } | undefined;
      const ownerId = owner?.id != null ? String(owner.id) : null;
      const ownerEmail = typeof owner?.email === "string" ? owner.email : null;

      const stubPayload = {
        viewId: id,
        viewName: name,
        workbookId: workbook?.id != null ? String(workbook.id) : null,
        workbookName: workbook?.name ?? null,
        siteId: auth.siteId,
      };
      const xmlBody = `<?xml version="1.0" encoding="UTF-8"?><biPrunerTableauStub xmlns="urn:bi-pruner:tableau">${escapeXml(
        JSON.stringify(stubPayload),
      )}</biPrunerTableauStub>`;

      drafts.push({
        organizationId: ctx.organizationId,
        connectorId: ctx.connectorId,
        externalId: `view:${id}`,
        title: name,
        ownerId,
        ownerEmail,
        lastAccessedAt: updatedAt,
        runFrequencyBucket: null,
        parentReportIds: [],
        definitionKind: "tableau_xml",
        definitionBody: xmlBody,
        astStructuralHash: null,
        rawMetadata: {
          source: "tableau",
          resourceType: "view",
          ...stubPayload,
          connectorDisplayName: ctx.displayName,
        },
      });
    }
    if (views.length < pageSize) {
      break;
    }
    page += 1;
  }

  return drafts;
}
