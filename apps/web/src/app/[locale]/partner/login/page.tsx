import { notFound, redirect } from "next/navigation";
import { isLocale } from "@fg/i18n";
import { getCurrentUser } from "@/lib/dal";
import { landingFor } from "@/lib/roles";
import { LoginForm } from "@/components/LoginForm";
import styles from "@/components/AuthForm.module.css";

/**
 * G-01 — the gym door.
 *
 * Separate from the member door on purpose: a gym signing in is doing a
 * different job from a member signing in, and one form describing both ends up
 * describing neither. Admin comes through here too — it is a back-office
 * account, not a customer one.
 */
export default async function PartnerLoginPage({
  params,
}: PageProps<"/[locale]/partner/login">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const user = await getCurrentUser();
  if (user) redirect(landingFor(user, locale));

  return (
    <main className={styles.main}>
      <LoginForm locale={locale} door="partner" />
    </main>
  );
}
