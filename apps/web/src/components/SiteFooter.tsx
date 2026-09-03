import Link from "next/link";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import styles from "./SiteFooter.module.css";

/**
 * The site footer.
 *
 * Emad's mockup prints two phone numbers and an email. He has since confirmed
 * the numbers are NOT real and the email does not exist yet, so those rows
 * show "to be confirmed" rather than the mockup's digits — publishing a
 * plausible-looking phone number on a live site sends real people to a
 * stranger.
 *
 * The rows are here so the layout is visible and so there is an obvious place
 * for the real details the moment he sends them.
 */
export function SiteFooter({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <div className={styles.brand}>
            <span className={styles.logo}>FG</span>
            <span className={styles.word}>{t("common.appName")}</span>
          </div>
          <p className={styles.tagline}>{t("footer.tagline")}</p>
        </div>

        <nav className={styles.col} aria-label={t("footer.links")}>
          <h2 className={styles.colTitle}>{t("footer.links")}</h2>
          <Link href={`/${locale}`} className={styles.link}>
            {t("nav.home")}
          </Link>
          <Link href={`/${locale}/explore`} className={styles.link}>
            {t("nav.explore")}
          </Link>
          <Link href={`/${locale}/login`} className={styles.link}>
            {t("auth.signIn")}
          </Link>
          <Link href={`/${locale}/partner/login`} className={styles.link}>
            {t("auth.gymSignIn")}
          </Link>
        </nav>

        <div className={styles.col}>
          <h2 className={styles.colTitle}>{t("footer.contact")}</h2>
          <p className={styles.row}>
            <span className={styles.rowLabel}>{t("footer.phone")}</span>
            <span className={styles.pending}>{t("footer.pending")}</span>
          </p>
          <p className={styles.row}>
            <span className={styles.rowLabel}>{t("footer.email")}</span>
            <span className={styles.pending}>{t("footer.pending")}</span>
          </p>
          <p className={styles.row}>
            <span className={styles.rowLabel}>{t("footer.address")}</span>
            <span>{t("footer.addressValue")}</span>
          </p>
        </div>
      </div>

      <p className={styles.demo}>{t("footer.demo")}</p>
    </footer>
  );
}
