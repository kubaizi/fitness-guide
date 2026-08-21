"use client";

import { useActionState } from "react";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { requestOtp, type AuthState } from "@/app/actions/auth";
import styles from "./AuthForm.module.css";

/**
 * C-03 — phone entry.
 *
 * `useActionState` wires the form straight to a Server Action and gives back
 * the pending flag and whatever the action returned, with no fetch call and no
 * client-side state to keep in sync.
 */
export function LoginForm({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const [state, action, pending] = useActionState<AuthState, FormData>(requestOtp, {});

  return (
    <form action={action} className={styles.card}>
      <input type="hidden" name="locale" value={locale} />

      <div>
        <h1 className={styles.title}>{t("auth.loginTitle")}</h1>
        <p className={styles.subtitle}>{t("auth.loginSubtitle")}</p>
      </div>

      {state.error && <p className={styles.error}>{state.error}</p>}

      <div>
        <label className={styles.label} htmlFor="phone">
          {t("auth.phoneLabel")}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder={t("auth.phonePlaceholder")}
          className={styles.input}
        />
      </div>

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? t("common.loading") : t("auth.sendCode")}
      </button>

      <p className={styles.hint}>{t("auth.devHint")}</p>
    </form>
  );
}
