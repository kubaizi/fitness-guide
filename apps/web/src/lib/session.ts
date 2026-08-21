import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { SESSION_TTL_MS } from "@fg/core";
import { prisma } from "./prisma";

/**
 * Session cookie handling.
 *
 * `server-only` at the top is not decoration: it makes the build FAIL if any
 * of this is ever imported into a client component, which is what stops the
 * signing secret from being bundled into JavaScript sent to browsers.
 *
 * The cookie carries an encrypted session *id*, nothing else — no user id, no
 * role, no name. Anything the cookie asserts, an attacker could tamper with;
 * anything looked up from the database on each request, they cannot. It also
 * means signing out actually revokes access rather than hoping the token
 * expires.
 */

const COOKIE_NAME = "fg_session";

function secretKey(): Uint8Array {
  const secret = process.env["SESSION_SECRET"];
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to at least 32 characters. See .env.example.",
    );
  }
  return new TextEncoder().encode(secret);
}

async function seal(sessionId: string, expiresAt: Date): Promise<string> {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey());
}

async function unseal(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const sid = payload["sid"];
    return typeof sid === "string" ? sid : null;
  } catch {
    // Tampered, expired or signed with a different secret — all mean "no session".
    return null;
  }
}

/** Creates a database session and sets the cookie. */
export async function createSession(
  userId: string,
  meta?: { userAgent?: string | undefined; ipAddress?: string | undefined },
): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ipAddress ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, await seal(session.id, expiresAt), {
    httpOnly: true, // unreadable from document.cookie, so XSS cannot steal it
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax", // survives normal navigation, blocks cross-site POSTs
    expires: expiresAt,
    path: "/",
  });
}

/** The signed-in user's id, or null. Verifies against the database every time. */
export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionId = await unseal(token);
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return null;

  // Expired rows are deleted rather than left to accumulate.
  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.userId;
}

/** Revokes the session server-side and clears the cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    const sessionId = await unseal(token);
    if (sessionId) {
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    }
  }

  cookieStore.delete(COOKIE_NAME);
}
