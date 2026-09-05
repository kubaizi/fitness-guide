import { notFound, redirect } from "next/navigation";
import { isLocale } from "@fg/i18n";
import { getCurrentUser } from "@/lib/dal";
import { landingFor } from "@/lib/roles";
import { SignUpForm } from "@/components/SignUpForm";
import styles from "@/components/AuthForm.module.css";

/**
 * Create a member account.
 *
 * There is no matching page under /partner. A gym cannot sign itself up: it
 * has to be verified before it can take money, so those accounts are made by
 * hand. See docs/product-decisions.md — "the platform approves, it does not
 * author".
 */
// Same three steps as every page here: await params, validate the locale,
// then render. See login/page.tsx for the walkthrough.
export default async function SignUpPage({ params }: PageProps<"/[locale]/signup">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  // Someone already signed in has no use for this page, and showing it would
  // read as a broken session. Send them where their role belongs.
  const user = await getCurrentUser();
  if (user) redirect(await landingFor(user, locale));

  return (
    <main className={styles.main}>
      <SignUpForm locale={locale} />
    </main>
  );
}
