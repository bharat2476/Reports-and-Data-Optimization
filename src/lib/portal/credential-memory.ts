import "server-only";

import type { EncryptedPayload } from "@/lib/vault/aead";

const g = globalThis as unknown as {
  __biPrunerCredentialVault?: Map<string, EncryptedPayload>;
};

function map(): Map<string, EncryptedPayload> {
  if (!g.__biPrunerCredentialVault) {
    g.__biPrunerCredentialVault = new Map();
  }
  return g.__biPrunerCredentialVault;
}

export function putEncryptedConnectorCredentials(connectorId: string, payload: EncryptedPayload): void {
  map().set(connectorId, payload);
}

export function hasEncryptedConnectorCredentials(connectorId: string): boolean {
  return map().has(connectorId);
}

/** Decrypt when ingestion workers need API access (never expose to clients). */
export function getEncryptedConnectorCredentials(connectorId: string): EncryptedPayload | undefined {
  return map().get(connectorId);
}
