import { notFound, redirect } from "next/navigation";
import { isLocale } from "@fg/i18n";
import { getCurrentUser } from "@/lib/dal";
import { landingFor } from "@/lib/roles";
import { LoginForm } from "@/components/LoginForm";
// Borrowing a component's stylesheet from a page. Fine because this page is
// nothing but a frame around that component — no styles of its own to add.
import styles from "@/components/AuthForm.module.css";

/** C-03 — the member door. Gyms and admins sign in at /partner/login. */
// ── The shape of nearly every page in this app ──
//
//   1. await params, validate the locale, 404 if wrong
//   2. check auth / load data
//   3. return markup
//
// Once you have read this file, most of the other pages will look familiar.
//
// Note how thin it is: it renders one component and makes one decision. The
// form itself is a client component (LoginForm), so only the interactive part
// ships JavaScript — this page's own code never reaches the browser.
export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  // Already signed in? Send them wherever their role belongs, which is not
  // necessarily this page's audience.
  //
  // A GUARD, and worth its two lines: without it a signed-in user reaching
  // /login sees a form asking them to sign in again, which reads as a broken
  // session. `landingFor` decides the destination by role — see lib/roles.ts.
  const user = await getCurrentUser();
  if (user) redirect(landingFor(user, locale));

  return (
    <main className={styles.main}>
      {/* `door="member"` is what makes one component serve two pages. Compare
          with partner/login/page.tsx, which is this file with one prop
          changed. */}
      <LoginForm locale={locale} door="member" />
    </main>
  );
}
