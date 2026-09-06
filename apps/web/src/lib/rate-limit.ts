import "server-only";

import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

/**
 * Refusing a source that tries too often.
 *
 * ## The problem this solves
 *
 * A Server Action is an ordinary web address. Nothing about it requires a
 * browser, a form, or a person. Ten lines of script can post to the sign-in
 * action a thousand times a minute, working through a password list against a
 * username it saw on the site. That is called CREDENTIAL STUFFING, and it is
 * how most accounts are actually taken — not by breaking the hashing, but by
 * guessing until something works.
 *
 * scrypt makes each guess slow, which helps. It does not make a million
 * guesses impossible; it just means the attacker needs longer, and meanwhile
 * every guess costs your server real CPU.
 *
 * ## What this does NOT solve
 *
 * The count is per IP address, so it stops one machine trying repeatedly. It
 * does nothing against a thousand machines trying once each — a DISTRIBUTED
 * attack. Stopping that needs something that can tell a browser from a script
 * before the request arrives, such as Cloudflare Turnstile or Vercel's own bot
 * filtering. This is the free half of the job, not the whole of it.
 *
 * ## Why the limit is per IP and not per username
 *
 * Counting failures against the username being targeted looks obviously right,
 * and it is a trap. Anyone could then lock Emad out of his own account by
 * typing his username with ten wrong passwords. A protection that lets a
 * stranger disable someone else's account has traded one problem for a worse
 * one.
 *
 * The cost of choosing IP is that a whole office behind one connection shares
 * a budget, which is why the limits below are generous rather than tight.
 */

/** How long a window lasts, and how many attempts it allows. */
// Two different jobs, so two different limits.
//
// Sign-in is generous: real people mistype passwords, and a family sharing a
// connection should not lock each other out. Ten wrong passwords in a quarter
// of an hour is still far below what guessing needs.
//
// Sign-up is tight: a real person signs up once. More than a few from one
// place in an hour is either a test or a script.
const LIMITS = {
  signin: { windowMs: 15 * 60 * 1000, max: 10 },
  signup: { windowMs: 60 * 60 * 1000, max: 5 },
} as const;

export type AttemptKind = keyof typeof LIMITS;

/**
 * The caller's IP address, as well as it can be known.
 *
 * ## Honest about the weakness
 *
 * `x-forwarded-for` is a header, and a header is just text the caller sent. On
 * its own it can be set to anything, which would make this trivial to defeat.
 *
 * It is trustworthy here only because Vercel sits in front and OVERWRITES it
 * with the real connecting address before the request reaches this code. That
 * is the whole reason it can be relied on — not the header, the proxy. Move
 * this app behind a different host and this function has to be rechecked.
 *
 * Running locally there is no proxy and no header, so everything shares the
 * key "local". That is correct for development: it means the limit can be
 * tested, and there is no real attacker on your own machine.
 */
async function callerKey(): Promise<string> {
  const h = await headers();

  // The header holds a chain when several proxies are involved:
  // "client, proxy1, proxy2". The first entry is the original caller.
  const forwarded = h.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();

  return first || h.get("x-real-ip") || "local";
}

/**
 * Has this caller already had too many goes?
 *
 * Call it BEFORE doing the expensive work — before verifying a password, which
 * is deliberately slow, and before writing anything. The point is to stop the
 * work happening, not to notice afterwards.
 */
export async function tooManyAttempts(kind: AttemptKind): Promise<boolean> {
  const { windowMs, max } = LIMITS[kind];
  const key = await callerKey();
  const since = new Date(Date.now() - windowMs);

  const recent = await prisma.attemptLog.count({
    where: { kind, key, createdAt: { gte: since } },
  });

  return recent >= max;
}

/**
 * Notes one attempt against this caller.
 *
 * Only failures are recorded for sign-in — see `clearAttempts` below for why.
 */
export async function recordAttempt(kind: AttemptKind): Promise<void> {
  const key = await callerKey();

  await prisma.attemptLog.create({ data: { kind, key } });

  // ── Tidying up as we go ──
  // Nothing else deletes these rows, so without this the table grows for ever.
  // A scheduled job would be the tidier answer, but that is a second thing to
  // deploy and keep working; doing it here means it cannot be forgotten.
  //
  // `Math.random() < 0.02` runs it on roughly one attempt in fifty. Every time
  // would mean a delete query on every sign-in for no benefit — the rows are
  // harmless until there are a great many of them.
  if (Math.random() < 0.02) {
    // A day covers the longest window many times over, so nothing still being
    // counted is ever removed.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.attemptLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  }
}

/**
 * Forgets this caller's failures. Called after a successful sign-in.
 *
 * Without it, someone who mistyped their password twice this morning carries
 * those two against them all afternoon — and could be refused later for
 * reasons they cannot see. Succeeding proves they are who they say, so the
 * count has served its purpose and should go.
 *
 * Sign-up is not cleared, because there the successful attempts are exactly
 * what needs counting: five real accounts from one address in an hour is the
 * thing being prevented.
 */
export async function clearAttempts(kind: AttemptKind): Promise<void> {
  const key = await callerKey();
  await prisma.attemptLog.deleteMany({ where: { kind, key } });
}
