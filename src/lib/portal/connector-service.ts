import "server-only";

import {
  isSupabaseConfigured,
  parseVaultMasterKey,
  parseVaultMasterKeyDevFallback,
} from "@/lib/env/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { augmentMissingTableError } from "@/lib/supabase/schema-errors";
import { encryptUtf8 } from "@/lib/vault/aead";
import { buildCredentialJson } from "@/lib/vault/credential-payload";
import { validateLookerConnection, validateTableauConnection } from "@/lib/vault/connection-validator";
import type { ConnectorType, PortalConnector } from "@/types/portal";

import * as credentialMemory from "./credential-memory";
import { getOrganizationIdForConnectors } from "./organization-service";
import * as portalStore from "./portal-store";

function vaultKey(): Buffer {
  if (process.env.NODE_ENV === "production") {
    try {
      return parseVaultMasterKey();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid BI_PRUNER_VAULT_KEY";
      const err = new Error(
        `${msg}. Set BI_PRUNER_VAULT_KEY to 32 bytes (hex 64 chars or base64).`,
      );
      (err as Error & { status?: number }).status = 503;
      throw err;
    }
  }
  return parseVaultMasterKeyDevFallback();
}

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

function mapDbRow(row: {
  id: string;
  organization_id: string;
  connector_type: string;
  display_name: string;
  connection_status: string;
  metadata: unknown;
  created_at: string;
  last_validated_at: string | null;
  validation_error: string | null;
}): PortalConnector {
  return {
    id: row.id,
    organizationId: row.organization_id,
    connectorType: row.connector_type as ConnectorType,
    displayName: row.display_name,
    connectionStatus: row.connection_status as PortalConnector["connectionStatus"],
    metadata: metadataToStrings(row.metadata),
    createdAt: row.created_at,
    lastValidatedAt: row.last_validated_at,
    validationError: row.validation_error,
    credentialsStored: true,
  };
}

export async function listConnectors(): Promise<PortalConnector[]> {
  if (!isSupabaseConfigured()) {
    return portalStore.listConnectors();
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bi_connectors")
    .select(
      "id, organization_id, connector_type, display_name, connection_status, metadata, created_at, last_validated_at, validation_error",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw augmentMissingTableError("bi_connectors list", error);
  }
  return (data ?? []).map(mapDbRow);
}

export type NewConnectorBody = {
  displayName: string;
  connectorType: ConnectorType;
  metadata: Record<string, string>;
  looker?: { clientId: string; clientSecret: string };
  tableau?: { patName: string; patSecret: string };
};

async function validateOnly(
  connectorType: ConnectorType,
  metadata: Record<string, string>,
  body: NewConnectorBody,
): Promise<
  | { ok: true; validatedAt: string; notes: string[] }
  | { ok: false; error: string }
> {
  const baseUrl = metadata.baseUrl?.trim() ?? "";
  if (!baseUrl) {
    return { ok: false, error: "metadata.baseUrl is required" };
  }
  if (connectorType === "looker") {
    if (!body.looker?.clientId?.trim() || !body.looker?.clientSecret?.trim()) {
      return { ok: false, error: "Looker requires credentials.looker.clientId and clientSecret" };
    }
    return validateLookerConnection(baseUrl, {
      clientId: body.looker.clientId.trim(),
      clientSecret: body.looker.clientSecret.trim(),
    });
  }
  if (!body.tableau?.patName?.trim() || !body.tableau?.patSecret?.trim()) {
    return { ok: false, error: "Tableau requires credentials.tableau.patName and patSecret" };
  }
  const siteContentUrl = (metadata.siteName ?? "").trim();
  return validateTableauConnection(baseUrl, siteContentUrl, {
    patName: body.tableau.patName.trim(),
    patSecret: body.tableau.patSecret.trim(),
  });
}

export async function createConnector(body: NewConnectorBody): Promise<PortalConnector> {
  const key = vaultKey();
  const validation = await validateOnly(body.connectorType, body.metadata, body);
  if (!validation.ok) {
    const err = new Error(validation.error);
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const json = buildCredentialJson(body.connectorType, body.looker, body.tableau);
  const encrypted = encryptUtf8(json, key);

  if (!isSupabaseConfigured()) {
    const row = portalStore.addConnector({
      displayName: body.displayName,
      connectorType: body.connectorType,
      metadata: body.metadata,
      connectionStatus: "valid",
      lastValidatedAt: validation.validatedAt,
      validationError: null,
    });
    credentialMemory.putEncryptedConnectorCredentials(row.id, encrypted);
    return { ...row, credentialsStored: true };
  }

  const organizationId = await getOrganizationIdForConnectors();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bi_connectors")
    .insert({
      organization_id: organizationId,
      connector_type: body.connectorType,
      display_name: body.displayName.trim(),
      credential_ciphertext: encrypted.ciphertext,
      credential_iv: encrypted.iv,
      credential_auth_tag: encrypted.authTag,
      credential_key_version: encrypted.keyVersion,
      connection_status: "valid",
      last_validated_at: validation.validatedAt,
      validation_error: null,
      metadata: body.metadata,
    })
    .select(
      "id, organization_id, connector_type, display_name, connection_status, metadata, created_at, last_validated_at, validation_error",
    )
    .single();

  if (error) {
    throw augmentMissingTableError("bi_connectors insert", error);
  }
  return mapDbRow(data);
}
