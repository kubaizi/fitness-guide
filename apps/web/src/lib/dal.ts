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

export type CurrentUser = DemoUser;

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return findUserById(userId);
});

/** Requires a signed-in user, or redirects to login. */
export async function requireUser(locale: Locale = DEFAULT_LOCALE): Promise<CurrentUser> {
  const user = await getCurrentUser();
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
export async function requireAdmin(
  locale: Locale = DEFAULT_LOCALE,
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/partner/login`);
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
export async function requireGymAccess(
  slug: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<{ user: CurrentUser; isAdmin: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/partner/login`);

  if (user.role === "admin") return { user, isAdmin: true };

  if (user.role === "gym_owner" || user.role === "gym_staff") {
    const own = gymForStaff(user.id);
    if (own && own.slug === slug) return { user, isAdmin: false };
  }

  notFound();
}
