// ── `node:crypto` ──
// The `node:` prefix says explicitly "this is a Node.js built-in module", not
// a package from npm. Node ships these; nothing is installed for them.
//
// Because this file imports a Node built-in, it can only ever run on the
// SERVER. A browser has no `node:crypto`. Keep that in mind when you reach the
// React components later — importing this file into browser code would break
// the build, which is exactly the protection you want for password handling.
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

// ── `interface` vs `type` ──
// Both describe a shape. Rough rule used in this codebase: `interface` for
// object shapes that might be extended, `type` for unions and aliases (a
// union like `A | B` cannot be written as an interface at all).
//
// Like `type`, an interface produces NO JavaScript. It vanishes at build time.
export interface PasswordHash {
  readonly salt: string;
  readonly hash: string;
}

// `salt?: string` — the `?` makes the parameter OPTIONAL. Callers may omit
// it, in which case its value inside the function is `undefined`. The type is
// therefore really `string | undefined`.
//
// It exists so the same function can both create a new hash (no salt given,
// so generate one) and recompute an existing one (salt supplied).
export function hashPassword(password: string, salt?: string): PasswordHash {
  // `??` supplies the fallback when no salt was passed. 16 random bytes
  // rendered as hexadecimal gives a 32-character string.
  const useSalt = salt ?? randomBytes(16).toString("hex");
  // `scryptSync` is the blocking version — it holds the thread until it
  // finishes. Acceptable at a login, where the whole point is to be slow.
  // It returns a Buffer (Node's raw byte array), converted to hex for storage.
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
  // Declared with `let` and no initial value because it is assigned inside
  // the `try` below. The `: Buffer` annotation is required here — with no
  // initial value, TypeScript has nothing to infer the type from.
  let candidate: Buffer;
  try {
    candidate = scryptSync(password, stored.salt, KEY_LENGTH, { N: COST });
    // `catch` with no `(error)` binding is legal modern JavaScript. Used when
    // you genuinely do not care what the error was — any failure here means
    // "the password does not verify", and nothing more useful can be said.
  } catch {
    return false;
  }

  const expected = Buffer.from(stored.hash, "hex");
  // Length check first: `timingSafeEqual` THROWS on mismatched lengths rather
  // than returning false, so this guard is required, not merely an optimisation.
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/** How long a signed-in session lasts before re-authentication. */
// Written as a multiplication chain rather than the literal 2592000000 so the
// arithmetic is self-documenting: 30 days × 24 hours × 60 minutes × 60
// seconds × 1000 milliseconds. The compiler folds it to a constant anyway.
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
