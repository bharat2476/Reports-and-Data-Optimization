import type { LoadedConnector, ReportMetadataDraft } from "./types";
import { structuralHashFromSql } from "@/parser/sql-compare";

const FETCH_MS = 45_000;

function normalizeBaseUrl(url: string): string {
  const u = url.trim().replace(/\/+$/, "");
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    return `https://${u}`;
  }
  return u;
}

function maxItems(): number {
  const raw = process.env.INGEST_LOOKER_MAX_ITEMS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 400;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 5000) : 400;
}

function maxDashboardDetails(): number {
  const raw = process.env.INGEST_LOOKER_MAX_DASHBOARDS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 60;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 60;
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

async function lookerLogin(
  root: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const res = await fetchWithTimeout(`${root}/api/4.0/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Looker login failed (${res.status}): ${text.slice(0, 400)}`);
  }
  const json = JSON.parse(text) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("Looker login missing access_token");
  }
  return json.access_token;
}

async function lookerGet(root: string, token: string, path: string): Promise<unknown> {
  const res = await fetchWithTimeout(`${root}${path}`, {
    headers: { Authorization: `token ${token}`, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Looker GET ${path} failed (${res.status}): ${text.slice(0, 400)}`);
  }
  return JSON.parse(text) as unknown;
}

type LookQuery = { id?: string | number; sql?: string | null };

function sqlFromQuery(q: LookQuery | null | undefined): string | null {
  if (!q) {
    return null;
  }
  const s = typeof q.sql === "string" ? q.sql.trim() : "";
  return s.length > 0 ? s : null;
}

async function resolveQuerySql(
  root: string,
  token: string,
  look: { query?: LookQuery | null; query_id?: string | number | null },
): Promise<string | null> {
  const inline = sqlFromQuery(look.query ?? null);
  if (inline) {
    return inline;
  }
  const qid = look.query_id;
  if (qid == null || qid === "") {
    return null;
  }
  const q = (await lookerGet(root, token, `/api/4.0/queries/${encodeURIComponent(String(qid))}?fields=id,sql`)) as LookQuery;
  return sqlFromQuery(q);
}

function astHashForSql(sql: string | null): string | null {
  if (!sql) {
    return null;
  }
  const r = structuralHashFromSql(sql, "bigquery");
  return r.ok ? r.structuralHash : null;
}

function baseDraft(
  ctx: LoadedConnector,
  externalId: string,
  partial: Omit<ReportMetadataDraft, "organizationId" | "connectorId" | "externalId">,
): ReportMetadataDraft {
  return {
    organizationId: ctx.organizationId,
    connectorId: ctx.connectorId,
    externalId,
    ...partial,
  };
}

export async function ingestLooker(ctx: LoadedConnector): Promise<ReportMetadataDraft[]> {
  if (ctx.credentials.kind !== "looker") {
    throw new Error("Looker connector expected");
  }
  const root = normalizeBaseUrl(ctx.metadata.baseUrl ?? "");
  const token = await lookerLogin(root, ctx.credentials.clientId, ctx.credentials.clientSecret);

  const userCache = new Map<string, { email: string | null }>();

  async function ownerEmail(userId: string | null | undefined): Promise<string | null> {
    if (!userId) {
      return null;
    }
    const key = String(userId);
    if (userCache.has(key)) {
      return userCache.get(key)!.email;
    }
    try {
      const u = (await lookerGet(root, token, `/api/4.0/users/${encodeURIComponent(key)}?fields=id,email`)) as {
        email?: string | null;
      };
      const email = typeof u.email === "string" ? u.email : null;
      userCache.set(key, { email });
      return email;
    } catch {
      userCache.set(key, { email: null });
      return null;
    }
  }

  const drafts: ReportMetadataDraft[] = [];
  const limit = 100;
  let offset = 0;
  const cap = maxItems();

  while (drafts.length < cap) {
    const batch = (await lookerGet(
      root,
      token,
      `/api/4.0/looks?limit=${limit}&offset=${offset}&fields=id,title,updated_at,user_id,query,query_id`,
    )) as unknown;
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }
    for (const look of batch) {
      if (drafts.length >= cap) {
        break;
      }
      const id = (look as { id?: string | number }).id;
      if (id == null) {
        continue;
      }
      const title = (look as { title?: string | null }).title ?? null;
      const userId = (look as { user_id?: string | number | null }).user_id;
      const updatedAt = (look as { updated_at?: string | null }).updated_at ?? null;
      const sql = await resolveQuerySql(root, token, look as { query?: LookQuery; query_id?: string | number });
      const email = await ownerEmail(userId == null ? null : String(userId));
      const extId = `look:${id}`;
      drafts.push(
        baseDraft(ctx, extId, {
          title,
          ownerId: userId == null ? null : String(userId),
          ownerEmail: email,
          lastAccessedAt: updatedAt,
          runFrequencyBucket: null,
          parentReportIds: [],
          definitionKind: sql ? "sql" : null,
          definitionBody: sql,
          astStructuralHash: astHashForSql(sql),
          rawMetadata: {
            source: "looker",
            resourceType: "look",
            lookId: String(id),
            connectorDisplayName: ctx.displayName,
          },
        }),
      );
    }
    offset += limit;
    if (batch.length < limit) {
      break;
    }
  }

  offset = 0;
  let dashboardCount = 0;
  const dashCap = maxDashboardDetails();

  while (dashboardCount < dashCap) {
    const dashboards = (await lookerGet(
      root,
      token,
      `/api/4.0/dashboards?limit=${limit}&offset=${offset}&fields=id,title,updated_at,user_id`,
    )) as unknown;
    if (!Array.isArray(dashboards) || dashboards.length === 0) {
      break;
    }
    for (const d of dashboards) {
      if (dashboardCount >= dashCap) {
        break;
      }
      const id = (d as { id?: string | number }).id;
      if (id == null) {
        continue;
      }
      dashboardCount += 1;
      const title = (d as { title?: string | null }).title ?? null;
      const userId = (d as { user_id?: string | number | null }).user_id;
      const updatedAt = (d as { updated_at?: string | null }).updated_at ?? null;
      const email = await ownerEmail(userId == null ? null : String(userId));

      let combinedSql: string | null = null;
      const elementMeta: { title?: string; queryId?: string }[] = [];
      try {
        const detail = (await lookerGet(
          root,
          token,
          `/api/4.0/dashboards/${encodeURIComponent(String(id))}`,
        )) as {
          dashboard_elements?: Array<{
            title?: string | null;
            query_id?: string | number | null;
            query?: LookQuery | null;
          }>;
        };
        const elements = detail.dashboard_elements ?? [];
        const parts: string[] = [];
        for (const el of elements) {
          const qid = el.query_id;
          const sql = await resolveQuerySql(root, token, {
            query: el.query ?? undefined,
            query_id: qid ?? undefined,
          });
          elementMeta.push({
            title: typeof el.title === "string" ? el.title : undefined,
            queryId: qid != null ? String(qid) : undefined,
          });
          if (sql) {
            parts.push(`-- ${el.title ?? "tile"}\n${sql}`);
          }
        }
        combinedSql = parts.length > 0 ? parts.join("\n\n") : null;
      } catch {
        combinedSql = null;
      }

      const extId = `dashboard:${id}`;
      drafts.push(
        baseDraft(ctx, extId, {
          title,
          ownerId: userId == null ? null : String(userId),
          ownerEmail: email,
          lastAccessedAt: updatedAt,
          runFrequencyBucket: null,
          parentReportIds: [],
          definitionKind: combinedSql ? "sql" : null,
          definitionBody: combinedSql,
          astStructuralHash: astHashForSql(combinedSql),
          rawMetadata: {
            source: "looker",
            resourceType: "dashboard",
            dashboardId: String(id),
            elementCount: elementMeta.length,
            connectorDisplayName: ctx.displayName,
          },
        }),
      );
    }
    offset += limit;
    if (dashboards.length < limit) {
      break;
    }
  }

  return drafts;
}
