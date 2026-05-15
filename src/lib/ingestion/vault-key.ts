import { parseVaultMasterKey, parseVaultMasterKeyDevFallback } from "@/lib/env/server";

/** Mirrors connector-service vault rules for decrypting stored credentials in the worker. */
export function vaultKeyForIngestion(): Buffer {
  if (process.env.NODE_ENV === "production") {
    return parseVaultMasterKey();
  }
  return parseVaultMasterKeyDevFallback();
}
