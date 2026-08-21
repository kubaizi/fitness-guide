"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { verifyOtp, type AuthState } from "@/app/actions/auth";
import styles from "./AuthForm.module.css";

/** C-04 — OTP entry. */
export function VerifyForm({ locale, phone }: { locale: Locale; phone: string }) {
  const t = createTranslator(locale);
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyOtp, {});

  return (
    <form action={action} className={styles.card}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="phone" value={phone} />

      <div>
        <h1 className={styles.title}>{t("auth.verifyTitle")}</h1>
        <p className={styles.subtitle}>
          {t("auth.verifySubtitle")} <b>{phone}</b>
        </p>
      </div>

      {state.error && <p className={styles.error}>{state.error}</p>}

      <div>
        <label className={styles.label} htmlFor="code">
          {t("auth.codeLabel")}
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          // Lets phones auto-fill the code straight from the SMS.
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          className={`${styles.input} ${styles.code}`}
        />
      </div>

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? t("common.loading") : t("auth.verify")}
      </button>

      <p className={styles.alt}>
        <Link href={`/${locale}/login`}>{t("auth.changeNumber")}</Link>
      </p>
    </form>
  );
}
