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
// Takes `slug` as well as `current`, because each gym's dashboard lives at
// its own URL — `/ar/manage/iron-club/plans`. AdminTabs needs no equivalent,
// since there is only one admin console.
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
    // `<nav>` rather than a div: it tells assistive technology this is a
    // navigation region, which screen-reader users can jump to directly.
    <nav className={styles.tabs}>
      {TABS.map((tab) =>
        tab.id === current ? (
          // The current section is not a link — there is nowhere to go, and a
          // link to the page you are on is a known screen-reader annoyance.
          //
          // `aria-current="page"` is what actually communicates "you are
          // here". The different styling conveys it to sighted users; this
          // attribute conveys the same thing to everyone else.
          <span key={tab.id} className={styles.tabActive} aria-current="page">
            {t(tab.label)}
          </span>
        ) : (
          <Link
            key={tab.id}
            // Three parts: locale, this gym's slug, then the tab's path.
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
