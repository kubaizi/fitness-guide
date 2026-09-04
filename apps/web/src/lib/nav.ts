import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import type { CurrentUser } from "./dal";
import { gymForStaff } from "./db";

/**
 * What appears in the navigation, for a given visitor.
 *
 * One source of truth, used by both the desktop header and the mobile drawer.
 * They previously each built their own list, which is exactly the sort of
 * duplication that ends with a link existing in one place and not the other.
 */
// The lesson generalises: when two components must show the same thing, the
// fix is to compute it once and pass it in — not to write the logic twice and
// keep the copies in step by discipline.

export interface NavItem {
  readonly href: string;
  readonly label: string;
}

// `CurrentUser | null` — null means signed out. The function handles both,
// which is why the header does not need its own signed-in check.
//
// Returns `NavItem[]`, a mutable array, because it is built up with `.push`
// below. Everywhere else this codebase prefers `readonly`; here the array is
// freshly created and never escapes before it is finished.
/**
 * The PUBLIC navigation: the marketplace's own sections.
 *
 * Personal links — profile, memberships, the gym you run, the admin console —
 * deliberately do NOT live here. They belong under the signed-in member's own
 * name, which is where people look for them, and it keeps this row free for
 * the sections as more of the ten are built.
 */
export function navItemsFor(_user: CurrentUser | null, locale: Locale): NavItem[] {
  const t = createTranslator(locale);

  const item = (path: string, key: TranslationKey): NavItem => ({
    href: path === "" ? `/${locale}` : `/${locale}/${path}`,
    label: t(key),
  });

  return [item("", "nav.home"), item("gyms", "nav.explore")];
}

/**
 * Everything that belongs to the signed-in person, for the menu under their
 * name. Sign-out is not here: it changes state, so it has to be a form
 * posting to a Server Action rather than a link.
 */
// Async because a gym owner needs the slug of the gym they run, and that is
// a database lookup. Every caller is a Server Component, so awaiting is free.
export async function accountItemsFor(
  user: CurrentUser,
  locale: Locale,
): Promise<NavItem[]> {
  const t = createTranslator(locale);
  const item = (path: string, key: TranslationKey): NavItem => ({
    href: `/${locale}/${path}`,
    label: t(key),
  });

  const items = [item("account", "nav.profile")];

  if (user.role === "admin") {
    // An admin holds no memberships of their own, so the console takes that
    // slot rather than sitting beside an always-empty page.
    items.push(item("admin", "nav.admin"));
    return items;
  }

  if (user.role === "gym_owner" || user.role === "gym_staff") {
    const own = await gymForStaff(user.id);
    if (own) {
      items.push({ href: `/${locale}/manage/${own.slug}`, label: t("nav.myGym") });
    }
  }

  items.push(item("memberships", "nav.memberships"));
  return items;
}
