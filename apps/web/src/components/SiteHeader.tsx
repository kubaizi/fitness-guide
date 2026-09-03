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
// ═══════════════════════════════════════════════════════════════════════════
// THE SERVER/CLIENT BOUNDARY — this file is the clearest example of it.
//
// SiteHeader is a SERVER component (no "use client"). It awaits the signed-in
// user directly, which a client component could never do.
//
// MobileMenu, rendered below, IS a client component — it needs useState for
// the open/closed drawer.
//
// The rule that surprises people: a Server Component may render a Client
// Component, but NOT the other way round by importing it. A client component
// cannot import a server one, because by the time it runs, the server is gone.
//
// So how does the drawer contain `AuthButton`, a server component? By being
// PASSED it, already rendered, as a prop:
//
//   auth={<AuthButton locale={locale} variant="drawer" />}
//
// The server renders AuthButton to finished markup and hands the result to
// the client component as ordinary data. This is the "slot" or "children as
// props" pattern, and it is the standard escape hatch whenever you need
// server content inside a client shell.
// ═══════════════════════════════════════════════════════════════════════════
export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  // A direct await for the session. Because this runs on the server, the
  // correct nav is in the very first HTML response — the visitor never sees
  // a flash of the wrong links, which is exactly what happens in a
  // client-side auth check.
  //
  // This is also wrapped in React's `cache()` (see lib/dal.ts), so the layout
  // and this header resolve the user once between them, not twice.
  const user = await getCurrentUser();
  // Nav is computed in one shared place so the header and the drawer cannot
  // disagree — see lib/nav.ts.
  const items = navItemsFor(user, locale);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href={`/${locale}`} className={styles.brand}>
          <span className={styles.logo}>FG</span>
          <span className={styles.word}>{t("common.appName")}</span>
        </Link>

        <nav className={styles.nav}>
          {/* The same `items` array the drawer receives below. */}
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
        {/* Both copies exist in the DOM at once; CSS hides whichever does not
            belong at the current width. Simpler and more reliable than
            measuring the viewport in JavaScript, which cannot know the answer
            until after hydration. */}
        <div className={styles.desktopLocale}>
          <AuthButton locale={locale} />
          <LocaleSwitch current={locale} />
        </div>

        <MobileMenu
          locale={locale}
          items={items}
          // The slot described in the block comment above: a server component
          // rendered here and handed to a client component as a prop.
          auth={<AuthButton locale={locale} variant="drawer" />}
        />
      </div>
    </header>
  );
}
