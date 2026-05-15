import "server-only";

import type { ConnectorType } from "@/types/portal";

export type LookerCredentialPayload = {
  kind: "looker";
  clientId: string;
  clientSecret: string;
};

export type TableauCredentialPayload = {
  kind: "tableau";
  patName: string;
  patSecret: string;
};

export type StoredCredentialPayload = LookerCredentialPayload | TableauCredentialPayload;

export function buildCredentialJson(
  connectorType: ConnectorType,
  looker: { clientId: string; clientSecret: string } | undefined,
  tableau: { patName: string; patSecret: string } | undefined,
): string {
  if (connectorType === "looker") {
    if (!looker?.clientId?.trim() || !looker?.clientSecret?.trim()) {
      throw new Error("Looker requires clientId and clientSecret");
    }
    const payload: LookerCredentialPayload = {
      kind: "looker",
      clientId: looker.clientId.trim(),
      clientSecret: looker.clientSecret.trim(),
    };
    return JSON.stringify(payload);
  }
  if (!tableau?.patName?.trim() || !tableau?.patSecret?.trim()) {
    throw new Error("Tableau requires patName and patSecret (Personal Access Token)");
  }
  const payload: TableauCredentialPayload = {
    kind: "tableau",
    patName: tableau.patName.trim(),
    patSecret: tableau.patSecret.trim(),
  };
  return JSON.stringify(payload);
}

export function parseStoredCredentialPayload(json: string): StoredCredentialPayload {
  const o = JSON.parse(json) as StoredCredentialPayload;
  if (o?.kind === "looker" || o?.kind === "tableau") {
    return o;
  }
  throw new Error("Invalid credential payload");
}
