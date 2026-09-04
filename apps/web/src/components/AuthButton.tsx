import Link from "next/link";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { getCurrentUser } from "@/lib/dal";
import { accountItemsFor } from "@/lib/nav";
import { AccountMenu } from "./AccountMenu";
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
// ── That last sentence is a genuinely important web principle ──
// GET requests must not change anything. Browsers prefetch links, crawlers
// follow them, and Next prefetches <Link> destinations on hover. A sign-out
// implemented as a link would fire when someone merely hovered near it.
//
// Anything that changes state belongs in a POST — which, in this codebase,
// means a <form> posting to a Server Action.
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
  // An async server component awaiting the session directly. This same
  // component is rendered twice per page — once for the desktop header, once
  // passed into the mobile drawer — but `cache()` in lib/dal.ts means the
  // session is still only resolved once.
  const user = await getCurrentUser();

  // TWO COMPLETELY DIFFERENT RETURNS from one component. Signed out gets two
  // links; signed in gets a form. Cleaner than one return full of ternaries,
  // since the two cases share no markup.
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

  // Signed in: the name and avatar open the member's own menu. Everything
  // personal hangs off it — profile, memberships, their gym, the console —
  // rather than crowding the public navigation.
  //
  // The sign-out form is built HERE, on the server, and passed to the menu as
  // a slot: it posts a Server Action, which a client component cannot import,
  // and it must stay a form rather than a link because it changes state.
  const signOutForm = (
    <form action={signOut} className={styles.form}>
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" className={styles.signOut}>
        {t("auth.signOut")}
      </button>
    </form>
  );

  return (
    <AccountMenu
      locale={locale}
      name={user.name}
      items={accountItemsFor(user, locale)}
      signOut={signOutForm}
      variant={inDrawer ? "drawer" : "header"}
    />
  );
}
