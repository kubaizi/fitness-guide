import Link from "next/link";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import styles from "./ManageForm.module.css";

/** The dashboard sections, in the order a gym works through them. */
export type ManageTab = "profile" | "plans" | "members" | "checkIns";

const TABS = [
  { id: "profile", path: "", label: "manage.editProfile" },
  { id: "plans", path: "/plans", label: "manage.editPlans" },
  { id: "members", path: "/members", label: "manage.editMembers" },
  { id: "checkIns", path: "/check-ins", label: "manage.editCheckIns" },
] as const;

/**
 * The gym dashboard's section nav.
 *
 * Kept in one place because four screens render it: the third copy of a tab
 * strip is where adding a section starts meaning "edit four files and forget
 * one of them".
 */
export function ManageTabs({
  current,
  slug,
  locale,
}: {
  current: ManageTab;
  slug: string;
  locale: Locale;
}) {
  const t = createTranslator(locale);

  return (
    <nav className={styles.tabs}>
      {TABS.map((tab) =>
        tab.id === current ? (
          // The current section is not a link — there is nowhere to go, and a
          // link to the page you are on is a known screen-reader annoyance.
          <span key={tab.id} className={styles.tabActive} aria-current="page">
            {t(tab.label)}
          </span>
        ) : (
          <Link
            key={tab.id}
            href={`/${locale}/manage/${slug}${tab.path}`}
            className={styles.tab}
          >
            {t(tab.label)}
          </Link>
        ),
      )}
    </nav>
  );
}
