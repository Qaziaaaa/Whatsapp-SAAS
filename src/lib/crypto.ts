import crypto from "crypto";

/**
 * AES-256-GCM encryption for WhatsApp credentials stored in the database.
 *
 * Storage format: base64(iv [12 bytes] + authTag [16 bytes] + ciphertext)
 *
 * Why AES-256-GCM?
 * - Authenticated encryption: detects tampering (authTag)
 * - Unique IV per encryption: same plaintext → different ciphertext every time
 * - Industry standard for secrets at rest
 *
 * The ENCRYPTION_KEY env var must be exactly 64 hex chars (32 bytes).
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). " +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing IV + authTag + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Concatenate: iv (12) + authTag (16) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypts a base64-encoded string produced by encrypt().
 * Throws if the ciphertext has been tampered with (authTag mismatch).
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const combined = Buffer.from(ciphertext, "base64");

  if (combined.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid ciphertext: too short to contain IV and auth tag");
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
