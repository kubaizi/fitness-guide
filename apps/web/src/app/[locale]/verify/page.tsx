import { notFound, redirect } from "next/navigation";
import { isLocale } from "@fg/i18n";
import { getCurrentUser } from "@/lib/dal";
import { VerifyForm } from "@/components/VerifyForm";
import styles from "@/components/AuthForm.module.css";

// C-04 — OTP entry. The phone arrives as a query param from the login step.
export default async function VerifyPage({
  params,
  searchParams,
}: PageProps<"/[locale]/verify">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const user = await getCurrentUser();
  if (user) redirect(`/${locale}/memberships`);

  const sp = await searchParams;
  const phoneParam = sp["phone"];
  const phone = typeof phoneParam === "string" ? phoneParam : "";

  // Landing here without a phone means the flow was skipped — start over.
  if (!phone) redirect(`/${locale}/login`);

  return (
    <main className={styles.main}>
      <VerifyForm locale={locale} phone={phone} />
    </main>
  );
}
