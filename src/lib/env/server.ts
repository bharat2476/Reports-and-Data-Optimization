import "server-only";

import { createHash } from "crypto";

/**
 * 32-byte AES-256 key from env.
 * Accepts 64-char hex or standard base64 / base64url (44 chars including padding variants).
 */
export function parseVaultMasterKey(): Buffer {
  const raw = process.env.BI_PRUNER_VAULT_KEY?.trim();
  if (!raw) {
    throw new Error("BI_PRUNER_VAULT_KEY is not set");
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
  const buf = Buffer.from(normalized, "base64");
  if (buf.length !== 32) {
    throw new Error("BI_PRUNER_VAULT_KEY must decode to exactly 32 bytes (AES-256)");
  }
  return buf;
}

/** Derive a 32-byte key from an arbitrary passphrase (development convenience only). */
export function parseVaultMasterKeyDevFallback(): Buffer {
  try {
    return parseVaultMasterKey();
  } catch {
    const phrase = process.env.BI_PRUNER_VAULT_DEV_PHRASE?.trim();
    if (!phrase) {
      throw new Error(
        "Set BI_PRUNER_VAULT_KEY (32 bytes, hex or base64) or BI_PRUNER_VAULT_DEV_PHRASE for local dev only",
      );
    }
    return createHash("sha256").update(phrase, "utf8").digest();
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function tableauRestApiVersion(): string {
  return process.env.TABLEAU_REST_API_VERSION?.trim() || "3.21";
}
