import { notFound, redirect } from "next/navigation";
import { isLocale } from "@fg/i18n";
import { getCurrentUser } from "@/lib/dal";
import { LoginForm } from "@/components/LoginForm";
import styles from "@/components/AuthForm.module.css";

// C-03 — phone entry.
export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  // Already signed in? There is nothing to do here.
  const user = await getCurrentUser();
  if (user) redirect(`/${locale}/memberships`);

  return (
    <main className={styles.main}>
      <LoginForm locale={locale} />
    </main>
  );
}
