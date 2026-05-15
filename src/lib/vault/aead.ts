import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALG = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export type EncryptedPayload = {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: string;
};

export function encryptUtf8(plaintext: string, key: Buffer, keyVersion = "v1"): EncryptedPayload {
  if (key.length !== 32) {
    throw new Error("Vault key must be 32 bytes");
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALG, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag, keyVersion };
}

export function decryptUtf8(payload: EncryptedPayload, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error("Vault key must be 32 bytes");
  }
  const decipher = createDecipheriv(ALG, key, payload.iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(payload.authTag);
  return decipher.update(payload.ciphertext, undefined, "utf8") + decipher.final("utf8");
}
