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
export function navItemsFor(user: CurrentUser | null, locale: Locale): NavItem[] {
  const t = createTranslator(locale);

  // A local helper defined inside the function so it can close over `locale`
  // and `t`. It removes the repetition of building an href and a label for
  // every single item.
  //
  // Typing `key` as `TranslationKey` means a typo in a nav label is a compile
  // error — see packages/i18n/src/translate.ts for how that type is derived.
  const item = (path: string, key: TranslationKey): NavItem => ({
    // The empty path is the home page, which is `/ar` rather than `/ar/`.
    href: path === "" ? `/${locale}` : `/${locale}/${path}`,
    label: t(key),
  });

  // Everyone sees these two, signed in or not.
  const items = [item("", "nav.home"), item("explore", "nav.explore")];

  // Signed out: no "Memberships". Showing it would promise a page that
  // immediately bounces to login, which reads as broken rather than gated.
  //
  // An EARLY RETURN. The rest of the function can then assume `user` is not
  // null — TypeScript narrows it automatically from this point down.
  if (!user) return items;

  if (user.role === "admin") {
    // One link, not one per section. The console has six sections and the
    // header cannot carry six more items — it is already tight in Arabic —
    // so /admin navigates itself with its own tab strip.
    //
    // `.push` MUTATES `items`, adding to the end. Safe here because the array
    // was created in this function and nobody else has a reference to it.
    items.push(item("admin", "nav.admin"));
    return items;
  }

  // A gym owner or staff member gets a direct link to the gym they run.
  if (user.role === "gym_owner" || user.role === "gym_staff") {
    const own = gymForStaff(user.id);
    if (own) {
      // Built literally rather than via `item()`, because the href contains a
      // dynamic slug rather than a fixed path segment.
      items.push({ href: `/${locale}/manage/${own.slug}`, label: t("nav.myGym") });
    }
  }

  // Members — and gym staff, who may also hold a membership of their own.
  items.push(item("memberships", "nav.memberships"));
  return items;
}
