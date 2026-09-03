import Link from "next/link";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
// Borrowing ManageTabs' stylesheet rather than duplicating it — the two tab
// strips are meant to look identical, so they share one source of styling.
import styles from "./ManageForm.module.css";

/** The admin console's sections. */
// Exported so each admin page can declare which tab it is by passing
// `current="gyms"`. Because it is a union, a page cannot pass a section that
// does not exist.
export type AdminTab =
  "overview" | "gyms" | "users" | "memberships" | "checkIns" | "payments";

// Data-driven again, like SectionGrid. `as const` keeps the `label` values as
// exact literals so they satisfy `TranslationKey` when passed to `t()`.
//
// The overview's path is "" so its URL is plain `/ar/admin` rather than
// `/ar/admin/overview` — the section index lives at the root of the console.
const TABS = [
  { id: "overview", path: "", label: "admin.tabOverview" },
  { id: "gyms", path: "/gyms", label: "admin.tabGyms" },
  { id: "users", path: "/users", label: "admin.tabUsers" },
  { id: "memberships", path: "/memberships", label: "admin.tabMemberships" },
  { id: "checkIns", path: "/check-ins", label: "admin.tabCheckIns" },
  { id: "payments", path: "/payments", label: "admin.tabPayments" },
] as const;

/**
 * Admin's section nav.
 *
 * Six sections is far more than the site header can carry — it is already
 * tight in Arabic — so the header holds a single "Admin" link and the console
 * navigates itself from here. Same shape as ManageTabs, deliberately: the two
 * consoles should not feel like different products.
 */
export function AdminTabs({ current, locale }: { current: AdminTab; locale: Locale }) {
  const t = createTranslator(locale);

  return (
    <nav className={styles.tabs}>
      {/* A `.map` whose callback body is a ternary rather than a block — note
          there is no `return`, because the arrow returns its expression
          directly. */}
      {TABS.map((tab) =>
        tab.id === current ? (
          // The active tab is a <span>, not a <Link>. See ManageTabs.tsx for
          // why linking to the page you are already on is a mistake.
          <span key={tab.id} className={styles.tabActive} aria-current="page">
            {t(tab.label)}
          </span>
        ) : (
          <Link key={tab.id} href={`/${locale}/admin${tab.path}`} className={styles.tab}>
            {t(tab.label)}
          </Link>
        ),
      )}
    </nav>
  );
}
