import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/*
 * Small crypto helpers for payments (docs/implementation-plan.md, sections
 * 6 and 7): AES-256-GCM for the Razorpay keys kept in the database, HMAC
 * checks for Razorpay's signatures, and the hashed manage-booking links.
 */

function masterKey() {
  const raw = process.env.PAYMENT_KEYS_SECRET;
  if (!raw) throw new Error("PAYMENT_KEYS_SECRET is not set, so payment keys can't be read or saved.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("PAYMENT_KEYS_SECRET must be 32 bytes in base64 (openssl rand -base64 32).");
  return key;
}

/** iv.tag.ciphertext, each in base64url. */
export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(sealed: string) {
  const [iv, tag, data] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Such as rzp_live_••••••••3f2a, for screens. */
export const maskKey = (value: string) => (value.length <= 12 ? "••••" : `${value.slice(0, value.indexOf("_", 4) + 1 || 4)}••••••••${value.slice(-4)}`);

/** Whether an HMAC-SHA256 hex signature matches, in constant time. */
export function signatureMatches(payload: string, secret: string, signature: string | null | undefined) {
  if (!signature) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(payload).digest("hex"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** A new private link token, and the hash the database keeps. */
export function newToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
