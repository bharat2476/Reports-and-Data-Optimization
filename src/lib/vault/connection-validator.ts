import "server-only";

import { tableauRestApiVersion } from "@/lib/env/server";

import type { LookerCredentialPayload, TableauCredentialPayload } from "./credential-payload";

export type ConnectionValidationResult =
  | {
      ok: true;
      validatedAt: string;
      /** Human-readable notes (connectivity; read-only is an operational guarantee on the credential). */
      notes: string[];
    }
  | { ok: false; error: string };

const FETCH_TIMEOUT_MS = 20_000;

function normalizeBaseUrl(url: string): string {
  const u = url.trim().replace(/\/+$/, "");
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    return `https://${u}`;
  }
  return u;
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Confirms Looker API 4.0 login and token-backed read of `/user`.
 * Read-only access must be enforced by issuing API3 credentials with minimal permissions in Looker Admin.
 */
export async function validateLookerConnection(
  baseUrl: string,
  creds: Pick<LookerCredentialPayload, "clientId" | "clientSecret">,
): Promise<ConnectionValidationResult> {
  const root = normalizeBaseUrl(baseUrl);
  const loginUrl = `${root}/api/4.0/login`;
  try {
    const loginRes = await fetchWithTimeout(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
      }),
    });
    const loginText = await loginRes.text();
    if (!loginRes.ok) {
      return {
        ok: false,
        error: `Looker login failed (${loginRes.status}): ${loginText.slice(0, 280)}`,
      };
    }
    let accessToken: string | undefined;
    try {
      accessToken = (JSON.parse(loginText) as { access_token?: string }).access_token;
    } catch {
      return { ok: false, error: "Looker login returned non-JSON body" };
    }
    if (!accessToken) {
      return { ok: false, error: "Looker login response missing access_token" };
    }

    const userRes = await fetchWithTimeout(`${root}/api/4.0/user`, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/json",
      },
    });
    if (!userRes.ok) {
      const t = await userRes.text();
      return {
        ok: false,
        error: `Looker user read failed (${userRes.status}): ${t.slice(0, 280)}`,
      };
    }

    const notes = [
      "Login and /user read succeeded.",
      "Use a dedicated API3 credential with viewer-style permissions; BI-Pruner cannot cryptographically prove read-only from this check alone.",
    ];
    return { ok: true, validatedAt: new Date().toISOString(), notes };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Looker connection error: ${msg}` };
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseTableauAuthToken(xml: string): string | null {
  const m = xml.match(/token\s*=\s*["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

/**
 * Tableau Server / Cloud REST sign-in with a Personal Access Token.
 * `siteContentUrl` is the site \"content URL\" (empty string for default site).
 */
export async function validateTableauConnection(
  baseUrl: string,
  siteContentUrl: string,
  creds: Pick<TableauCredentialPayload, "patName" | "patSecret">,
): Promise<ConnectionValidationResult> {
  const root = normalizeBaseUrl(baseUrl);
  const version = tableauRestApiVersion();
  const signinUrl = `${root}/api/${version}/auth/signin`;
  const site = siteContentUrl.trim();
  const body = `<?xml version='1.0' encoding='UTF-8' ?><tsRequest><credentials personalAccessTokenName="${escapeXml(
    creds.patName,
  )}" personalAccessTokenSecret="${escapeXml(creds.patSecret)}" ><site contentUrl="${escapeXml(
    site,
  )}" /></credentials></tsRequest>`;

  try {
    const res = await fetchWithTimeout(signinUrl, {
      method: "POST",
      headers: { "Content-Type": "application/xml", Accept: "application/xml" },
      body,
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `Tableau sign-in failed (${res.status}): ${text.slice(0, 400)}`,
      };
    }
    const token = parseTableauAuthToken(text);
    if (!token) {
      return { ok: false, error: "Tableau sign-in response missing credentials token" };
    }

    const notes = [
      "REST sign-in with PAT succeeded.",
      "Issue a PAT scoped to the minimum site and workbook permissions required for metadata reads.",
    ];
    return { ok: true, validatedAt: new Date().toISOString(), notes };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Tableau connection error: ${msg}` };
  }
}
