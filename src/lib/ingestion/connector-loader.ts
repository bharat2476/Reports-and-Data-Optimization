import "server-only";

import type { EncryptedPayload } from "@/lib/vault/aead";
import { decryptStoredCredentials } from "@/lib/vault/open-credentials";
import { isSupabaseConfigured } from "@/lib/env/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import * as credentialMemory from "@/lib/portal/credential-memory";
import * as portalStore from "@/lib/portal/portal-store";

import { byteaToBuffer } from "./bytea";
import type { LoadedConnector } from "./types";
import { vaultKeyForIngestion } from "./vault-key";

function metadataToStrings(meta: unknown): Record<string, string> {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (typeof v === "string" && v.length > 0) {
      out[k] = v;
    }
  }
  return out;
}

function toEncryptedPayload(row: {
  credential_ciphertext: unknown;
  credential_iv: unknown;
  credential_auth_tag: unknown | null;
  credential_key_version: string | null;
}): EncryptedPayload {
  const authTag = row.credential_auth_tag != null ? byteaToBuffer(row.credential_auth_tag) : Buffer.alloc(0);
  if (authTag.length === 0) {
    throw new Error("credential_auth_tag is required for GCM payloads");
  }
  return {
    ciphertext: byteaToBuffer(row.credential_ciphertext),
    iv: byteaToBuffer(row.credential_iv),
    authTag,
    keyVersion: row.credential_key_version ?? "v1",
  };
}

export async function loadConnectorsForIngestion(): Promise<LoadedConnector[]> {
  const key = vaultKeyForIngestion();
  const out: LoadedConnector[] = [];

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("bi_connectors")
      .select(
        "id, organization_id, connector_type, display_name, metadata, connection_status, credential_ciphertext, credential_iv, credential_auth_tag, credential_key_version",
      )
      .eq("connection_status", "valid");

    if (error) {
      throw new Error(`bi_connectors list for ingestion failed: ${error.message}`);
    }

    for (const row of data ?? []) {
      const enc = toEncryptedPayload(row);
      const credentials = decryptStoredCredentials(enc, key);
      out.push({
        organizationId: row.organization_id,
        connectorId: row.id,
        connectorType: row.connector_type as LoadedConnector["connectorType"],
        displayName: row.display_name,
        metadata: metadataToStrings(row.metadata),
        credentials,
      });
    }
    return out;
  }

  for (const c of portalStore.listConnectors()) {
    if (c.connectionStatus !== "valid") {
      continue;
    }
    const enc = credentialMemory.getEncryptedConnectorCredentials(c.id);
    if (!enc) {
      continue;
    }
    const credentials = decryptStoredCredentials(enc, key);
    out.push({
      organizationId: c.organizationId,
      connectorId: c.id,
      connectorType: c.connectorType,
      displayName: c.displayName,
      metadata: c.metadata,
      credentials,
    });
  }

  return out;
}
