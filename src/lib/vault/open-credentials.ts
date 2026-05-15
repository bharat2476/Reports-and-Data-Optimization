import "server-only";

import { decryptUtf8, type EncryptedPayload } from "./aead";
import { parseStoredCredentialPayload, type StoredCredentialPayload } from "./credential-payload";

export function decryptStoredCredentials(
  payload: EncryptedPayload,
  key: Buffer,
): StoredCredentialPayload {
  const json = decryptUtf8(payload, key);
  return parseStoredCredentialPayload(json);
}
