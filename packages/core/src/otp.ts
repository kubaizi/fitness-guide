import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/**
 * One-time login codes.
 *
 * Pure functions, deliberately: everything risky about OTP is decidable
 * without a database or a network, so it is all testable. The Prisma calls
 * live in the app; the rules live here.
 */

/** Six digits — the most people will retype from an SMS without errors. */
export const OTP_LENGTH = 6;

/** Short enough to limit a stolen-SMS window, long enough to actually type. */
export const OTP_TTL_MS = 5 * 60 * 1000;

/**
 * Six digits is a million combinations — trivially brute-forced without a cap.
 * Five wrong tries and the code is dead.
 */
export const OTP_MAX_ATTEMPTS = 5;

/** How long a signed-in session lasts before re-authentication. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Generates a code with `crypto.randomInt`, NOT `Math.random`.
 *
 * Math.random is a predictable PRNG — an attacker who observes a few codes
 * can compute the rest. It must never be used for anything security-bearing.
 */
export function generateOtp(): string {
  const max = 10 ** OTP_LENGTH;
  return String(randomInt(0, max)).padStart(OTP_LENGTH, "0");
}

/**
 * Hashes a code for storage.
 *
 * Plain SHA-256 rather than bcrypt/argon2 on purpose: those are deliberately
 * slow to defend low-entropy human passwords against offline cracking. An OTP
 * is high-entropy relative to its five-minute life and five-attempt cap, and
 * this runs on every verify, so a slow KDF would only add latency.
 */
export function hashOtp(code: string, phone: string): string {
  // The phone is mixed in so an identical code for a different number does
  // not produce the same hash.
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

/** Constant-time comparison — a fast `===` leaks the answer through timing. */
export function verifyOtpHash(code: string, phone: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashOtp(code, phone), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

/**
 * Normalises a Kuwaiti phone number to E.164.
 *
 * People type "9123 4567", "+965 91234567" or "0096591234567" and all mean the
 * same number. Storing one canonical form is what makes `User.phone @unique`
 * actually mean something.
 */
export function normalizeKuwaitPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");

  const local = digits.startsWith("00965")
    ? digits.slice(5)
    : digits.startsWith("965")
      ? digits.slice(3)
      : digits;

  // Kuwaiti mobile numbers are 8 digits and start with 5, 6 or 9.
  if (!/^[569]\d{7}$/.test(local)) return null;
  return `+965${local}`;
}

export type OtpCheck =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: "expired" | "consumed" | "locked" | "mismatch";
    };

/**
 * Every rule for whether a submitted code is acceptable, in one place.
 *
 * Order matters: expiry and lockout are checked BEFORE the code is compared,
 * so a locked-out attacker learns nothing from further guesses.
 */
export function checkOtp(params: {
  readonly code: string;
  readonly phone: string;
  readonly storedHash: string;
  readonly expiresAt: Date;
  readonly attempts: number;
  readonly consumedAt: Date | null;
  readonly now?: Date;
}): OtpCheck {
  const now = params.now ?? new Date();

  if (params.consumedAt !== null) return { ok: false, reason: "consumed" };
  if (params.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: "locked" };
  if (now >= params.expiresAt) return { ok: false, reason: "expired" };
  if (!verifyOtpHash(params.code, params.phone, params.storedHash)) {
    return { ok: false, reason: "mismatch" };
  }
  return { ok: true };
}
