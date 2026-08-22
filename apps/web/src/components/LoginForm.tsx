"use client";

import { useActionState } from "react";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { signIn, type AuthState } from "@/app/actions/auth";
import styles from "./AuthForm.module.css";

/**
 * Sign in with a username or phone number, plus a password.
 *
 * `useActionState` wires the form straight to a Server Action and hands back
 * the pending flag and whatever the action returned — no fetch call, no
 * client-side state to keep in sync.
 */
export function LoginForm({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});

  return (
    <form action={action} className={styles.card}>
      <input type="hidden" name="locale" value={locale} />

      <div>
        <h1 className={styles.title}>{t("auth.loginTitle")}</h1>
        <p className={styles.subtitle}>{t("auth.loginSubtitle")}</p>
      </div>

      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <div>
        <label className={styles.label} htmlFor="identifier">
          {t("auth.identifierLabel")}
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          autoFocus
          placeholder={t("auth.identifierPlaceholder")}
          className={styles.input}
        />
      </div>

      <div>
        <label className={styles.label} htmlFor="password">
          {t("auth.passwordLabel")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={styles.input}
        />
      </div>

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? t("common.loading") : t("auth.signIn")}
      </button>

      <p className={styles.hint}>{t("auth.demoAccounts")}</p>
    </form>
  );
}
