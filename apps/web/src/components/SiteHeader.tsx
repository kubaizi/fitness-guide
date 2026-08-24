import Link from "next/link";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { getCurrentUser } from "@/lib/dal";
import { navItemsFor } from "@/lib/nav";
import { LocaleSwitch } from "./LocaleSwitch";
import { MobileMenu } from "./MobileMenu";
import { AuthButton } from "./AuthButton";
import styles from "./SiteHeader.module.css";

/**
 * A server component, so the navigation is decided before anything reaches
 * the browser — no flash of links the visitor is not entitled to, and no
 * auth state duplicated on the client.
 */
export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const user = await getCurrentUser();
  const items = navItemsFor(user, locale);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href={`/${locale}`} className={styles.brand}>
          <span className={styles.logo}>FG</span>
          <span className={styles.word}>{t("common.appName")}</span>
        </Link>

        <nav className={styles.nav}>
          {items.map((it) => (
            <Link key={it.href} href={it.href} className={styles.link}>
              {it.label}
            </Link>
          ))}
        </nav>

        {/*
          The locale switch is two full words wide. On a 375px screen it does
          not fit alongside the wordmark and the menu trigger, so on mobile it
          moves inside the drawer instead.
        */}
        <div className={styles.desktopLocale}>
          <AuthButton locale={locale} />
          <LocaleSwitch current={locale} />
        </div>

        <MobileMenu locale={locale} items={items} auth={<AuthButton locale={locale} />} />
      </div>
    </header>
  );
}
