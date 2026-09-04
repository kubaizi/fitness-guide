// Build-time guard: this module may never reach the browser. See the same
// import at the top of dal.ts for the full explanation.
import "server-only";
// `cookies()` is Next.js's server-side cookie API. Importing it makes this a
// server module by definition — there is no browser equivalent.
import { cookies } from "next/headers";
// `jose` is a third-party library for JSON Web Tokens. Chosen over the more
// common `jsonwebtoken` because it uses Web Crypto, which works in Next's
// Edge runtime as well as in Node.
import { SignJWT, jwtVerify } from "jose";
import { SESSION_TTL_MS } from "@fg/core";

/**
 * Cookie-based sessions — no database.
 *
 * There is no database in the demo build, so a session cannot be a row that
 * gets looked up. Instead the session lives entirely in a signed cookie: the
 * server can verify it was issued here (the signature proves that) without
 * storing anything.
 *
 * TRADEOFF, stated plainly: a cookie session cannot be revoked server-side.
 * Signing out clears the cookie on that browser, but a copy taken beforehand
 * stays valid until it expires. The fix, when it matters, is a Session table:
 * one row per sign-in, checked on each request and deleted on sign-out. There
 * is now a database to put it in — it is not built because nothing here is
 * worth stealing yet.
 *
 * Acceptable while the demo holds no real customer data. Revisit before it
 * does.
 */

// ═══════════════════════════════════════════════════════════════════════════
// WHAT A JWT ACTUALLY IS
//
// Three base64 chunks joined by dots: header.payload.signature
//
//   header    which algorithm signed it
//   payload   the data — here just { uid: "user_2" } plus timestamps
//   signature the first two parts, hashed together with a SECRET only the
//             server knows
//
// The crucial point, and the one most often misunderstood: the payload is
// ENCODED, NOT ENCRYPTED. Anyone can paste the cookie into jwt.io and read
// it. What they cannot do is CHANGE it, because altering the payload breaks
// the signature and the server rejects it.
//
// So: never put anything secret in a JWT. A user id is fine — it is not a
// secret, and the signature is what proves it was not tampered with.
// ═══════════════════════════════════════════════════════════════════════════

const SESSION_COOKIE = "fg_session";

function secretKey(): Uint8Array {
  // `process.env["SESSION_SECRET"]` reads an environment variable — set in
  // .env locally, and in the Vercel dashboard in production. It is read at
  // RUNTIME on the server and never bundled into client code.
  const secret = process.env["SESSION_SECRET"] ?? "";

  /*
   * Two different problems, two different messages.
   *
   * "Not set" and "set but too short" need opposite fixes, and a single
   * message covering both sent someone hunting through Vercel's settings for
   * a variable that was never there. Worth the extra branch: this throw only
   * ever surfaces in a log, where the whole job is telling you what to do.
   */
  if (secret === "") {
    throw new Error(
      "SESSION_SECRET is not set. Locally, copy apps/web/.env.example to .env. " +
        "On Vercel, add it under Settings > Environment Variables (tick " +
        "Production) and then REDEPLOY — variables are read at build time, so " +
        "saving one changes nothing about a build that already exists.",
    );
  }

  if (secret.length < 32) {
    throw new Error(
      `SESSION_SECRET is set but only ${secret.length} characters long; it must ` +
        "be at least 32. Generate one with: openssl rand -base64 48",
    );
  }

  // `TextEncoder` converts a string into raw bytes (`Uint8Array`), which is
  // what the crypto functions want. Text in, bytes out — a standard built-in.
  return new TextEncoder().encode(secret);
}

// A BUILDER CHAIN: each method returns the builder, so calls can be strung
// together, and `.sign()` at the end produces the finished token.
//
// `Record<string, unknown>` means "an object with string keys and values of
// unknown type" — deliberately loose, since a payload can hold anything.
async function sign(payload: Record<string, unknown>, expiresAt: Date): Promise<string> {
  return (
    new SignJWT(payload)
      // HS256: symmetric signing — the same secret both signs and verifies.
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      // The expiry is INSIDE the signed payload, so it cannot be edited by the
      // browser. The cookie's own `expires` (set below) is only a hint to the
      // browser; this is the one that is actually enforced.
      .setExpirationTime(expiresAt)
      .sign(secretKey())
  );
}

// `verify<T>` is generic so the caller states the shape it expects back.
// Note that this is a PROMISE, not proof — see the comment at the call site
// in getSessionUserId about why the result is still checked at runtime.
async function verify<T>(token: string): Promise<T | null> {
  try {
    // `jwtVerify` checks the signature AND the expiry, throwing if either
    // fails. Passing `algorithms` explicitly matters for security: without
    // it, an attacker could present a token claiming `alg: "none"`.
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload as T;
  } catch {
    // Tampered, expired, or signed with another secret — all mean "no".
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────── session

// Called by the sign-in action once a password has been verified.
export async function createSession(userId: string): Promise<void> {
  // `Date.now()` is milliseconds since 1970. Adding the TTL gives the expiry.
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  // `await cookies()` — in current Next.js this is asynchronous. Older
  // tutorials show `cookies()` used without await; that is out of date and
  // will not work here.
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, await sign({ uid: userId }, expiresAt), {
    // ── The four options below are the security of this cookie ──
    httpOnly: true, // invisible to document.cookie, so XSS cannot read it
    // HTTPS only in production; relaxed locally, where there is no certificate.
    secure: process.env.NODE_ENV === "production",
    // "lax" sends the cookie on normal navigation to the site but not on
    // cross-site form posts — the standard defence against CSRF, where
    // another site tries to make a request as the signed-in user.
    sameSite: "lax",
    expires: expiresAt,
    path: "/", // sent for every route, not just the one that set it
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  // `?.value` because `.get()` returns undefined when the cookie is absent.
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // `{ uid?: unknown }` is deliberately pessimistic: "there might be a uid,
  // and it might be anything". The token was verified as authentic, but its
  // CONTENTS still come from outside this function — an old token from a
  // previous version of the app could hold anything at all.
  const payload = await verify<{ uid?: unknown }>(token);
  // So the shape is checked at runtime before being trusted. `typeof` narrows
  // `unknown` to `string`, which is what lets this satisfy the return type.
  return typeof payload?.uid === "string" ? payload.uid : null;
}

// Sign-out. Note what this can and cannot do: it clears the cookie in THIS
// browser. It cannot invalidate a copy of the token taken beforehand — that
// is the tradeoff spelled out in the header comment.
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
