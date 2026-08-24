import type { Locale } from "@fg/i18n";
import type { CurrentUser } from "./dal";
import { gymForStaff } from "./db";

/**
 * Which sign-in screen an account belongs to.
 *
 * The site has two front doors, because the two audiences have nothing in
 * common: a member signs in on their phone to show a QR code at a turnstile,
 * a gym signs in to change prices and read its roster. One combined form has
 * to be vague enough to describe both, which leaves neither audience sure they
 * are in the right place.
 *
 * Admin sits behind the gym door. It is a back-office account, not a customer
 * one, and giving it a third screen of its own would be a screen nobody needs.
 */
export type Door = "member" | "partner";

export function doorFor(role: string): Door {
  switch (role) {
    case "gym_owner":
    case "gym_staff":
    case "admin":
      return "partner";
    default:
      return "member";
  }
}

/**
 * Where an account lands after signing in.
 *
 * Everyone should arrive somewhere that is theirs. Sending a gym owner to
 * "My memberships" — a page that is empty for them — was the old behaviour and
 * read as a broken sign-in.
 */
export function landingFor(user: CurrentUser, locale: Locale): string {
  if (user.role === "admin") return `/${locale}/admin/gyms`;

  if (user.role === "gym_owner" || user.role === "gym_staff") {
    const own = gymForStaff(user.id);
    // A staff account with no gym attached has nothing to manage, so the
    // public site is the only honest destination.
    return own ? `/${locale}/manage/${own.slug}` : `/${locale}`;
  }

  return `/${locale}/memberships`;
}
