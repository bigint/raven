import { createDecipheriv, createHash, pbkdf2Sync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;
// Static salt — unique to Raven. Using a fixed salt is acceptable here because
// the input is already a high-entropy secret, not a user password.
const SALT = Buffer.from("raven-encryption-key-derivation-v1");

const keyCache = new Map<string, Buffer>();
const deriveKey = (secret: string): Buffer => {
  const cached = keyCache.get(secret);
  if (cached) return cached;
  const key = pbkdf2Sync(secret, SALT, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512");
  keyCache.set(secret, key);
  return key;
};

// Legacy key derivation for backward compatibility with existing encrypted data
const legacyKeyCache = new Map<string, Buffer>();
const deriveLegacyKey = (secret: string): Buffer => {
  const cached = legacyKeyCache.get(secret);
  if (cached) return cached;
  const key = createHash("sha256").update(secret).digest();
  legacyKeyCache.set(secret, key);
  return key;
};

export const decrypt = (ciphertext: string, secret: string): string => {
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  // Try new PBKDF2 key first
  try {
    const key = deriveKey(secret);
    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch {
    // Fall back to legacy SHA-256 key for data encrypted before the upgrade
    const legacyKey = deriveLegacyKey(secret);
    const decipher = createDecipheriv(ALGORITHM, legacyKey, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final("utf8");
  }
};
