import Link from "next/link";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { getCurrentUser } from "@/lib/dal";
import { signOut } from "@/app/actions/auth";
import styles from "./AuthButton.module.css";

/**
 * Sign in / sign out.
 *
 * A server component, so it reads the session directly with no loading flash
 * and no auth state duplicated on the client. Sign-out is a form posting to a
 * Server Action rather than a link — it changes state, so it must not be a GET
 * that a prefetch or a crawler could trigger.
 */
export async function AuthButton({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link href={`/${locale}/login`} className={styles.signIn}>
        {t("auth.signIn")}
      </Link>
    );
  }

  return (
    <form action={signOut} className={styles.form}>
      <input type="hidden" name="locale" value={locale} />
      <span className={styles.phone}>{user.phone}</span>
      <button type="submit" className={styles.signOut}>
        {t("auth.signOut")}
      </button>
    </form>
  );
}
