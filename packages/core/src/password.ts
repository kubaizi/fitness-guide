import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing.
 *
 * Uses scrypt, which is built into Node — no dependency — and is a real key
 * derivation function rather than a plain hash. That matters: SHA-256 of a
 * password can be reversed with a rainbow table in seconds, because it is
 * designed to be fast. scrypt is deliberately slow and memory-hard, so
 * guessing costs real time and RAM per attempt.
 *
 * Each password gets its own random salt, so two people choosing the same
 * password produce different hashes and one cracked hash reveals nothing
 * about the other.
 *
 * The demo passwords are "123", which no amount of hashing makes safe — but
 * hashing is the correct shape, so a real password dropped in later is
 * actually protected rather than sitting in a file in plain text.
 */

/** scrypt cost. 2^14 is a reasonable interactive-login setting. */
const COST = 16384;
const KEY_LENGTH = 64;

export interface PasswordHash {
  readonly salt: string;
  readonly hash: string;
}

export function hashPassword(password: string, salt?: string): PasswordHash {
  const useSalt = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, useSalt, KEY_LENGTH, { N: COST }).toString("hex");
  return { salt: useSalt, hash };
}

/**
 * Verifies a password in constant time.
 *
 * A plain `===` on the hashes leaks information: it returns faster the earlier
 * the first differing byte is, which is enough to reconstruct a hash one byte
 * at a time. timingSafeEqual always takes the same time.
 */
export function verifyPassword(password: string, stored: PasswordHash): boolean {
  let candidate: Buffer;
  try {
    candidate = scryptSync(password, stored.salt, KEY_LENGTH, { N: COST });
  } catch {
    return false;
  }

  const expected = Buffer.from(stored.hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/** How long a signed-in session lasts before re-authentication. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
