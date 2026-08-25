import Link from "next/link";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import styles from "./ManageForm.module.css";

/** The admin console's sections. */
export type AdminTab =
  "overview" | "gyms" | "users" | "memberships" | "checkIns" | "payments";

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
      {TABS.map((tab) =>
        tab.id === current ? (
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
