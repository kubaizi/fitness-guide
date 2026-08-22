import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import type { CurrentUser } from "./dal";

/**
 * What appears in the navigation, for a given visitor.
 *
 * One source of truth, used by both the desktop header and the mobile drawer.
 * They previously each built their own list, which is exactly the sort of
 * duplication that ends with a link existing in one place and not the other.
 */

export interface NavItem {
  readonly href: string;
  readonly label: string;
}

export function navItemsFor(user: CurrentUser | null, locale: Locale): NavItem[] {
  const t = createTranslator(locale);
  const item = (path: string, key: TranslationKey): NavItem => ({
    href: path === "" ? `/${locale}` : `/${locale}/${path}`,
    label: t(key),
  });

  const items = [item("", "nav.home"), item("explore", "nav.explore")];

  // Signed out: no "Memberships". Showing it would promise a page that
  // immediately bounces to login, which reads as broken rather than gated.
  if (!user) return items;

  if (user.role === "admin") {
    // An admin has no memberships of their own, so that link is replaced by
    // the two things an admin actually needs.
    items.push(item("admin/users", "nav.users"), item("admin/gyms", "nav.gyms"));
    return items;
  }

  items.push(item("memberships", "nav.memberships"));
  return items;
}
