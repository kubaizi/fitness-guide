import Link from "next/link";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { LocaleSwitch } from "./LocaleSwitch";
import styles from "./SiteHeader.module.css";

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href={`/${locale}`} className={styles.brand}>
          <span className={styles.logo}>FG</span>
          <span className={styles.word}>{t("common.appName")}</span>
        </Link>

        <nav className={styles.nav}>
          <Link href={`/${locale}`} className={styles.link}>
            {t("nav.home")}
          </Link>
          {/* Explore and Memberships have no screen yet. A disabled label is
              honest about that; a Link back to Home would look like a bug. */}
          <span className={styles.soon} aria-disabled="true">
            {t("nav.explore")}
          </span>
          <span className={styles.soon} aria-disabled="true">
            {t("nav.memberships")}
          </span>
        </nav>

        <LocaleSwitch current={locale} />
      </div>
    </header>
  );
}
