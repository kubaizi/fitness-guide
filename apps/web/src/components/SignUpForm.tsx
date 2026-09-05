"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { signUp, type SignUpState } from "@/app/actions/auth";
import styles from "./AuthForm.module.css";

/**
 * Create a member account.
 *
 * Built the same way as LoginForm — `useActionState` wired to a Server Action,
 * so there is no fetch call and no client-side loading state to keep in sync.
 * Read that file first if this pattern is new; the comments there explain it
 * properly rather than repeating here.
 *
 * Two things this form does that LoginForm does not:
 *
 *   1. It marks the offending field. `state.field` comes back from the action
 *      naming which input was wrong, so the message sits beside that box.
 *   2. It refills itself. `state.values` carries back everything except the
 *      passwords, so a rejection does not wipe four correct answers.
 *
 * Passwords are deliberately not echoed back. Putting a password into the HTML
 * that the server sends would write it into the page source, and from there
 * into any proxy or browser cache that keeps a copy.
 */
export function SignUpForm({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const [state, action, pending] = useActionState<SignUpState, FormData>(signUp, {});

  // `defaultValue`, not `value`. With `value` the input becomes CONTROLLED —
  // React fixes what it shows, and without an onChange handler it would be
  // impossible to type in. `defaultValue` sets the starting text and then
  // leaves the box alone, which is what a plain HTML form wants.
  const previous = state.values;

  /** The error message, but only on the field it belongs to. */
  // A small helper rather than five copies of the same ternary. Returns the
  // message for the named field and nothing for the others, so exactly one
  // message shows even though every field calls it.
  const errorFor = (field: SignUpState["field"]) =>
    state.field === field ? state.error : undefined;

  return (
    <form action={action} className={styles.card}>
      <input type="hidden" name="locale" value={locale} />

      <div>
        <h1 className={styles.title}>{t("signup.title")}</h1>
        <p className={styles.subtitle}>{t("signup.subtitle")}</p>
      </div>

      {/* The catch-all. An error with no `field` — none exist today, but a
          future one might — would otherwise be silent, and a form that
          refuses to submit while saying nothing is the worst kind. */}
      {state.error && !state.field && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <div>
        <label className={styles.label} htmlFor="name">
          {t("signup.nameLabel")}
        </label>
        {/* Note the absence of `dir="ltr"`, which every other field on this
            form carries. A name is the one thing here that someone will type
            in Arabic, so it has to follow the page direction instead. */}
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          autoFocus
          defaultValue={previous?.name}
          placeholder={t("signup.namePlaceholder")}
          className={styles.input}
        />
        <FieldError message={errorFor("name")} />
      </div>

      <div>
        <label className={styles.label} htmlFor="username">
          {t("signup.usernameLabel")}
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          defaultValue={previous?.username}
          className={styles.input}
          // Latin characters and digits, so forced left-to-right even on the
          // Arabic page — the bidi algorithm would otherwise reorder them as
          // they are typed. Same reason as LoginForm.
          dir="ltr"
        />
        <p className={styles.hint}>{t("signup.usernameHint")}</p>
        <FieldError message={errorFor("username")} />
      </div>

      <div>
        <label className={styles.label} htmlFor="phone">
          {t("signup.phoneLabel")}
        </label>
        <input
          id="phone"
          name="phone"
          // `type="tel"` brings up the phone keypad on a mobile, which is most
          // of the audience. It does NOT validate anything — the server does
          // that, with normalizeKuwaitPhone.
          type="tel"
          autoComplete="tel"
          required
          defaultValue={previous?.phone}
          placeholder={t("signup.phonePlaceholder")}
          className={styles.input}
          dir="ltr"
        />
        <FieldError message={errorFor("phone")} />
      </div>

      <div>
        <label className={styles.label} htmlFor="password">
          {t("signup.passwordLabel")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          // "new-password", not "current-password" — this is what tells a
          // password manager to offer to generate one rather than to fill in
          // something it already knows.
          autoComplete="new-password"
          required
          className={styles.input}
          dir="ltr"
        />
        <p className={styles.hint}>{t("signup.passwordHint")}</p>
        <FieldError message={errorFor("password")} />
      </div>

      <div>
        <label className={styles.label} htmlFor="confirm">
          {t("signup.confirmLabel")}
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className={styles.input}
          dir="ltr"
        />
        <p className={styles.hint}>{t("signup.confirmHint")}</p>
        <FieldError message={errorFor("confirm")} />
      </div>

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? t("common.loading") : t("signup.submit")}
      </button>

      <p className={styles.alt}>
        <Link href={`/${locale}/login`}>{t("signup.haveAccount")}</Link>
      </p>
    </form>
  );
}

/**
 * One field's error message, or nothing.
 *
 * `role="alert"` so a screen reader announces it the moment it appears —
 * without it, someone not looking at the screen gets no signal at all, because
 * focus does not move.
 */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className={styles.error} role="alert">
      {message}
    </p>
  );
}
