import { scryptSync, randomBytes, randomUUID, createHash, timingSafeEqual } from "crypto";

/**
 * Hash a password using scrypt (Node built-in, no external deps).
 * Stored as `scrypt$salt$hash` for verification later.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, salt, hash] = stored.split("$");
    if (algo !== "scrypt" || !salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64).toString("hex");
    // Constant-time comparison
    if (candidate.length !== hash.length) return false;
    let diff = 0;
    for (let i = 0; i < candidate.length; i++) {
      diff |= candidate.charCodeAt(i) ^ hash.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

/**
 * Hash any secret (API secret, session token) for storage.
 * Returns SHA-256 hex digest. Constant-time compare via timingSafeEqual.
 */
export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Generate a secure session token (URL-safe).
 */
export function generateSessionToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Generate a version-4 UUID using crypto.randomUUID.
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Generate a display-once API secret with a prefix the user can identify later.
 * Format: <prefix>_<env>_<random32>
 */
export function generateApiSecret(
  prefix: string,
  env: string,
  bytes = 32
): { fullSecret: string; keyPrefix: string } {
  const rand = randomBytes(bytes).toString("base64url");
  const fullSecret = `${prefix}_${env}_${rand}`;
  // prefix stored is just the part shown in lists
  const keyPrefix = `${prefix}_${env}_${rand.slice(0, 4)}••••`;
  return { fullSecret, keyPrefix };
}
