// ── `import "server-only"` ──
// A side-effect import (no names pulled out) of a tiny package that does one
// job: if this file ever ends up in a CLIENT bundle, the BUILD FAILS with a
// clear message.
//
// That is a safety net, not a nuisance. This module reads the session cookie
// and makes authorisation decisions; shipping it to a browser would be a
// serious leak. Rather than trusting everyone to remember, the build enforces it.
import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { DEFAULT_LOCALE, type Locale } from "@fg/i18n";
import { getSessionUserId } from "./session";
import { findUserById, gymForStaff, type DemoUser } from "./db";

/**
 * The Data Access Layer.
 *
 * Authorisation belongs as close to the data as possible, not only on the
 * route — Next's auth guide is explicit that route checks are a first pass.
 * `cache()` memoises per render pass, so calling this in a layout and three
 * components resolves the user once.
 */

// ═══════════════════════════════════════════════════════════════════════════
// THE PATTERN IN THIS FILE, AND WHY IT IS SHAPED LIKE THIS
//
// Every function here either RETURNS a user or never returns at all — it
// redirects or throws a 404 instead. That is what makes them usable as a
// single line at the top of a page:
//
//   const user = await requireAdmin(locale);
//   // if this line is reached, `user` is definitely an admin
//
// There is no `if (!user) return <Forbidden/>` to forget, because the type
// says `Promise<CurrentUser>` — not `Promise<CurrentUser | null>`. The
// unauthorised path cannot fall through, so it cannot be mishandled.
//
// `redirect()` and `notFound()` work by THROWING a special exception that
// Next.js catches. Two consequences worth knowing:
//   • Code after them never runs — which is why TypeScript accepts
//     `if (!user) redirect(...); return user;` with no `else`.
//   • Never call them inside a `try { }` that catches everything, or you will
//     swallow the redirect and break the page in a confusing way.
// ═══════════════════════════════════════════════════════════════════════════

// A type alias re-exported under a name that fits this layer. Callers say
// `CurrentUser` (a role in the app) rather than `DemoUser` (a storage detail).
export type CurrentUser = DemoUser;

// ── React's `cache()` ──
// Wraps a function so that within a SINGLE server render, repeated calls with
// the same arguments run the body only once and reuse the result.
//
// Why it matters here: the layout asks who is signed in, the header asks, and
// two page components ask. Without `cache` that is four cookie reads and four
// user lookups per request. With it, one.
//
// The cache lasts exactly one request — it is not a shared cache across users,
// which would be a severe security bug. Think "memoise for this render".
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return findUserById(userId);
});

/** Requires a signed-in user, or redirects to login. */
// `locale: Locale = DEFAULT_LOCALE` — optional with a default, so a caller
// that has no locale to hand still gets a sensible redirect target.
export async function requireUser(locale: Locale = DEFAULT_LOCALE): Promise<CurrentUser> {
  const user = await getCurrentUser();
  // No `return` in front of redirect() and no `else` after it. Both are fine
  // because redirect throws — see the block comment above.
  if (!user) redirect(`/${locale}/login`);
  return user;
}

/**
 * Requires an admin.
 *
 * Signed out redirects to the PARTNER door — an admin page is never what a
 * member was looking for — but a signed-in non-admin gets a 404 rather
 * than "forbidden" — telling someone a page exists but is off-limits is an
 * invitation. As far as a member is concerned, /admin simply is not a route.
 */
// The distinction above is a real security practice, sometimes called
// avoiding information disclosure. A 403 confirms the URL is real, which is
// useful to someone probing the site. A 404 tells them nothing.
export async function requireAdmin(
  locale: Locale = DEFAULT_LOCALE,
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/partner/login`);
  // `notFound()` throws too, and renders the app's 404 page.
  if (user.role !== "admin") notFound();
  return user;
}

/**
 * Requires permission to edit a specific gym.
 *
 * An admin may edit any gym. A gym owner or staff member may edit only the
 * gym they are attached to — checked against the stored link, never against
 * anything the browser sent, so changing the URL achieves nothing.
 *
 * Anyone else gets a 404 rather than "forbidden", for the same reason as
 * requireAdmin: a refusal that confirms the page exists is still information.
 *
 * Signed out goes to the partner door, since a dashboard URL is only ever
 * reached by someone who runs a gym.
 */
// Returns `isAdmin` alongside the user so the dashboard can show admin-only
// controls without asking a second time.
export async function requireGymAccess(
  slug: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<{ user: CurrentUser; isAdmin: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/partner/login`);

  // Admins pass unconditionally, for any gym.
  if (user.role === "admin") return { user, isAdmin: true };

  if (user.role === "gym_owner" || user.role === "gym_staff") {
    // ── THE SECURITY-CRITICAL LINE ──
    // `gymForStaff(user.id)` looks up which gym this account is attached to,
    // from stored data. The `slug` argument came from the URL, i.e. from the
    // user, and is therefore untrusted.
    //
    // Comparing the two is the authorisation check: the URL only decides
    // WHICH gym is being requested, never whether it is allowed. Editing the
    // URL to another gym's slug fails this comparison and falls through to
    // notFound() below.
    const own = await gymForStaff(user.id);
    if (own && own.slug === slug) return { user, isAdmin: false };
  }

  // Reached by anyone who did not pass a check above. Note there is no
  // `return` — notFound() throws, which is also why TypeScript is satisfied
  // that this function always returns the promised type.
  notFound();
}
