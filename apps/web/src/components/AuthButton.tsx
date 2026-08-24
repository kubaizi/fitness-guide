import Link from "next/link";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { getCurrentUser } from "@/lib/dal";
import { signOut } from "@/app/actions/auth";
import styles from "./AuthButton.module.css";

/**
 * Sign in / sign out.
 *
 * Signed out this shows BOTH doors, because a gym owner arriving at the site
 * has no other way to discover theirs — the member form is not where they
 * belong, and a link buried inside it only helps someone who already guessed
 * wrong. Members are the larger audience, so theirs is the solid button and
 * the gym's is the quieter one beside it.
 *
 * A server component, so it reads the session directly with no loading flash
 * and no auth state duplicated on the client. Sign-out is a form posting to a
 * Server Action rather than a link — it changes state, so it must not be a GET
 * that a prefetch or a crawler could trigger.
 */
export async function AuthButton({
  locale,
  variant = "header",
}: {
  locale: Locale;
  /** "drawer" stacks the two doors full width inside the mobile panel. */
  variant?: "header" | "drawer";
}) {
  const inDrawer = variant === "drawer";
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className={`${styles.doors} ${inDrawer ? styles.doorsDrawer : ""}`}>
        <Link href={`/${locale}/login`} className={styles.signIn}>
          {t("auth.signIn")}
        </Link>
        <Link href={`/${locale}/partner/login`} className={styles.gymSignIn}>
          {t("auth.gymSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form
      action={signOut}
      className={`${styles.form} ${inDrawer ? styles.formDrawer : ""}`}
    >
      <input type="hidden" name="locale" value={locale} />
      {/* The NAME, not the phone. The phone was hidden below 900px and blank
          for admin, so the header gave no clue you were signed in at all —
          which made a stale session look like a bug in the navigation. */}
      <span className={styles.who}>{user.name}</span>
      <button type="submit" className={styles.signOut}>
        {t("auth.signOut")}
      </button>
    </form>
  );
}
