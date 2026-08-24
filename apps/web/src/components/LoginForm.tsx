"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { signIn, type AuthState } from "@/app/actions/auth";
import type { Door } from "@/lib/roles";
import styles from "./AuthForm.module.css";

/**
 * Sign in with a username or phone number, plus a password.
 *
 * One component, two doors. The copy, the example username and the demo
 * accounts all change with `door`, so each audience sees a screen written for
 * them — but there is only one form to keep working.
 *
 * `useActionState` wires the form straight to a Server Action and hands back
 * the pending flag and whatever the action returned — no fetch call, no
 * client-side state to keep in sync.
 */
export function LoginForm({ locale, door }: { locale: Locale; door: Door }) {
  const t = createTranslator(locale);
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});

  const isMember = door === "member";
  const otherHref = isMember ? `/${locale}/partner/login` : `/${locale}/login`;

  return (
    <form action={action} className={styles.card}>
      <input type="hidden" name="locale" value={locale} />
      {/* Which door this is. The action re-reads it and will not let an
          account through the wrong one. */}
      <input type="hidden" name="door" value={door} />

      <div>
        <h1 className={styles.title}>
          {t(isMember ? "auth.memberTitle" : "auth.partnerTitle")}
        </h1>
        <p className={styles.subtitle}>
          {t(isMember ? "auth.memberSubtitle" : "auth.partnerSubtitle")}
        </p>
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
          placeholder={t(isMember ? "auth.memberPlaceholder" : "auth.partnerPlaceholder")}
          className={styles.input}
          dir="ltr"
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
          dir="ltr"
        />
      </div>

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? t("common.loading") : t("auth.signIn")}
      </button>

      <p className={styles.hint}>
        {t(isMember ? "auth.memberDemo" : "auth.partnerDemo")}
      </p>

      {/* The way out when someone is at the wrong door. Emphasised once the
          action has actually told them so. */}
      <p className={state.wrongDoor ? styles.altStrong : styles.alt}>
        <Link href={otherHref}>{t(isMember ? "auth.toPartner" : "auth.toMember")}</Link>
      </p>
    </form>
  );
}
