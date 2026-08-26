import "server-only";
import { cookies } from "next/headers";
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
 * stays valid until it expires. With a real database this goes back to a
 * Session row that can be deleted — see the `Session` model kept in
 * docs/future-database-schema.prisma for when that day comes.
 *
 * Acceptable here because the demo holds no real customer data.
 */

const SESSION_COOKIE = "fg_session";

function secretKey(): Uint8Array {
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

  return new TextEncoder().encode(secret);
}

async function sign(payload: Record<string, unknown>, expiresAt: Date): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey());
}

async function verify<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload as T;
  } catch {
    // Tampered, expired, or signed with another secret — all mean "no".
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────── session

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, await sign({ uid: userId }, expiresAt), {
    httpOnly: true, // invisible to document.cookie, so XSS cannot read it
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verify<{ uid?: unknown }>(token);
  return typeof payload?.uid === "string" ? payload.uid : null;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
