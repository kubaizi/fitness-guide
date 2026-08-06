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
          <Link href={`/${locale}/explore`} className={styles.link}>
            {t("nav.explore")}
          </Link>
          <Link href={`/${locale}/memberships`} className={styles.link}>
            {t("nav.memberships")}
          </Link>
        </nav>

        <LocaleSwitch current={locale} />
      </div>
    </header>
  );
}
