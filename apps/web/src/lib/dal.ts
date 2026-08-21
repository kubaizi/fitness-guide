import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, type Locale } from "@fg/i18n";
import { getSessionUserId } from "./session";
import { prisma } from "./prisma";

/**
 * The Data Access Layer.
 *
 * Next.js's own auth guide is blunt about this: proxy/middleware checks are a
 * first pass, not the defence. The real check belongs as close to the data as
 * possible — so functions that read user data call `verifySession()`
 * themselves rather than trusting whatever page happened to call them.
 *
 * React's `cache()` memoises per render pass, so calling this in a layout, a
 * page and three components costs one database query, not five.
 */

export interface CurrentUser {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly role: string;
  readonly locale: string;
}

/** The current user, or null when signed out. Never throws. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, phone: true, role: true, locale: true },
  });
  return user ?? null;
});

/**
 * Requires a signed-in user, or redirects to login.
 *
 * Use this in any page or action that must not run for an anonymous visitor.
 * Returning the user rather than a boolean means the caller cannot forget to
 * fetch it afterwards.
 */
export async function requireUser(locale: Locale = DEFAULT_LOCALE): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
}
