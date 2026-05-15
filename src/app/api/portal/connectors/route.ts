import { NextResponse } from "next/server";

import { createConnector, listConnectors } from "@/lib/portal/connector-service";
import type { ConnectorType } from "@/types/portal";

const types = new Set<ConnectorType>(["looker", "tableau"]);

export async function GET() {
  try {
    const connectors = await listConnectors();
    return NextResponse.json({ connectors });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected object body" }, { status: 400 });
  }

  const rec = body as Record<string, unknown>;
  const { displayName, connectorType, metadata, credentials } = rec;

  if (typeof displayName !== "string" || displayName.trim().length < 2) {
    return NextResponse.json(
      { error: "displayName is required (min 2 characters)" },
      { status: 400 },
    );
  }

  if (typeof connectorType !== "string" || !types.has(connectorType as ConnectorType)) {
    return NextResponse.json(
      { error: "connectorType must be looker or tableau" },
      { status: 400 },
    );
  }

  const meta =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? Object.fromEntries(
          Object.entries(metadata as Record<string, unknown>).filter(
            ([k, v]) => typeof k === "string" && typeof v === "string" && v.trim().length > 0,
          ),
        )
      : {};

  const baseUrl = typeof meta.baseUrl === "string" ? meta.baseUrl.trim() : "";
  if (!baseUrl) {
    return NextResponse.json(
      { error: "metadata.baseUrl is required (Looker or Tableau server URL)" },
      { status: 400 },
    );
  }

  if (!credentials || typeof credentials !== "object" || Array.isArray(credentials)) {
    return NextResponse.json(
      { error: "credentials object is required (Looker API3 or Tableau PAT)" },
      { status: 400 },
    );
  }

  const cred = credentials as Record<string, unknown>;
  let looker: { clientId: string; clientSecret: string } | undefined;
  let tableau: { patName: string; patSecret: string } | undefined;

  if (connectorType === "looker") {
    const inner = cred.looker;
    if (!inner || typeof inner !== "object" || Array.isArray(inner)) {
      return NextResponse.json(
        { error: "credentials.looker with clientId and clientSecret is required" },
        { status: 400 },
      );
    }
    const o = inner as Record<string, unknown>;
    if (typeof o.clientId !== "string" || typeof o.clientSecret !== "string") {
      return NextResponse.json(
        { error: "credentials.looker.clientId and clientSecret must be strings" },
        { status: 400 },
      );
    }
    looker = { clientId: o.clientId, clientSecret: o.clientSecret };
  } else {
    const inner = cred.tableau;
    if (!inner || typeof inner !== "object" || Array.isArray(inner)) {
      return NextResponse.json(
        { error: "credentials.tableau with patName and patSecret is required" },
        { status: 400 },
      );
    }
    const o = inner as Record<string, unknown>;
    if (typeof o.patName !== "string" || typeof o.patSecret !== "string") {
      return NextResponse.json(
        { error: "credentials.tableau.patName and patSecret must be strings" },
        { status: 400 },
      );
    }
    tableau = { patName: o.patName, patSecret: o.patSecret };
  }

  try {
    const connector = await createConnector({
      displayName,
      connectorType: connectorType as ConnectorType,
      metadata: { ...meta, baseUrl },
      looker,
      tableau,
    });
    return NextResponse.json({ connector }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status =
      typeof (e as { status?: number }).status === "number"
        ? (e as { status?: number }).status!
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
