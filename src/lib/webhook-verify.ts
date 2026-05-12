import crypto from "crypto";

/**
 * Verifies the X-Hub-Signature-256 header from Meta's WhatsApp webhook.
 *
 * Meta signs every webhook POST with HMAC-SHA256 using your app secret.
 * The header format is: "sha256=<hex_digest>"
 *
 * Why timingSafeEqual?
 * A naive string comparison (===) leaks timing information — an attacker
 * can measure how long the comparison takes to guess the correct signature
 * byte by byte. crypto.timingSafeEqual() always takes the same time
 * regardless of where the strings differ.
 *
 * @param rawBody  - The raw request body as a Buffer (must be read BEFORE JSON.parse)
 * @param signature - The X-Hub-Signature-256 header value (e.g. "sha256=abc123...")
 * @param appSecret - The WhatsApp App Secret from Meta Developer Console
 * @returns true if the signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  appSecret: string
): boolean {
  if (!signature || !appSecret) return false;

  // Strip the "sha256=" prefix
  const receivedHex = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;

  // Compute expected HMAC-SHA256
  const expectedHex = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  // Both buffers must be the same length for timingSafeEqual
  if (receivedHex.length !== expectedHex.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedHex, "hex"),
      Buffer.from(receivedHex, "hex")
    );
  } catch {
    // Buffer.from will throw if receivedHex contains non-hex characters
    return false;
  }
}
