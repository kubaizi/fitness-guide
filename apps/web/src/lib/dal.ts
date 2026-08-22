import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { DEFAULT_LOCALE, type Locale } from "@fg/i18n";
import { getSessionUserId } from "./session";
import { findUserById, type DemoUser } from "./db";

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
 * Signed out redirects to login, but a signed-in non-admin gets a 404 rather
 * than "forbidden" — telling someone a page exists but is off-limits is an
 * invitation. As far as a member is concerned, /admin simply is not a route.
 */
export async function requireAdmin(
  locale: Locale = DEFAULT_LOCALE,
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.role !== "admin") notFound();
  return user;
}
