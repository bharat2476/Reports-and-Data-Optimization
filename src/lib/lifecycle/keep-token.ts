import { createHmac, createHash, timingSafeEqual } from "crypto";

function productionSecret(): string {
  const s = process.env.REPORT_KEEP_HMAC_SECRET?.trim();
  if (!s || s.length < 16) {
    throw new Error("REPORT_KEEP_HMAC_SECRET must be set (min 16 chars) for signed keep links");
  }
  return s;
}

function hmacKey(): string {
  if (process.env.NODE_ENV === "production") {
    return productionSecret();
  }
  try {
    return productionSecret();
  } catch {
    const phrase = process.env.REPORT_KEEP_HMAC_DEV_PHRASE?.trim() ?? "bi-pruner-dev-keep-link-key";
    return createHash("sha256").update(phrase, "utf8").digest("hex");
  }
}

export function signKeepPayload(reportId: string, organizationId: string, expUnixSec: number): string {
  const payload = `${reportId}|${organizationId}|${expUnixSec}`;
  return createHmac("sha256", hmacKey()).update(payload, "utf8").digest("hex");
}

export function verifyKeepSignature(
  reportId: string,
  organizationId: string,
  expUnixSec: number,
  sigHex: string,
): boolean {
  try {
    const expected = signKeepPayload(reportId, organizationId, expUnixSec);
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(sigHex.trim(), "hex");
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function defaultKeepLinkExpirySec(): number {
  const raw = process.env.REPORT_KEEP_LINK_TTL_SEC?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 14 * 24 * 3600;
  return Number.isFinite(n) && n > 3600 ? Math.min(n, 90 * 24 * 3600) : 14 * 24 * 3600;
}
