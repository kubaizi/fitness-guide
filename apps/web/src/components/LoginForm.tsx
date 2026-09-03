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
// ═══════════════════════════════════════════════════════════════════════════
// `useActionState` — HOW A FORM TALKS TO A SERVER ACTION.
//
//   const [state, action, pending] = useActionState(fn, initialState);
//
//   state    what the action returned last time (initially `initialState`)
//   action   a wrapped function to hand to <form action={...}>
//   pending  true while the submission is in flight
//
// Compare with how this was written before Server Actions existed:
//
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(false);
//   async function onSubmit(e) {
//     e.preventDefault();
//     setLoading(true);
//     const res = await fetch("/api/login", { method: "POST", body: ... });
//     const data = await res.json();
//     if (!res.ok) setError(data.error);
//     setLoading(false);
//   }
//
// …plus the API route itself. All of that is replaced by the one line below.
// The loading flag and the error channel come free, and because it is a real
// <form>, it still submits if JavaScript has not finished loading.
// ═══════════════════════════════════════════════════════════════════════════
export function LoginForm({ locale, door }: { locale: Locale; door: Door }) {
  const t = createTranslator(locale);
  // The two generic arguments say what flows each way: `AuthState` comes
  // back from the action, `FormData` goes in. `{}` is the initial state —
  // valid because every field of AuthState is optional.
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});

  // Computed once and read six times below. Cleaner than repeating the
  // comparison inline at every branch.
  const isMember = door === "member";
  const otherHref = isMember ? `/${locale}/partner/login` : `/${locale}/login`;

  return (
    // `action={action}` — the wrapped function from useActionState, NOT
    // `signIn` directly. Passing the raw action would work but would give up
    // the `state` and `pending` values.
    <form action={action} className={styles.card}>
      <input type="hidden" name="locale" value={locale} />
      {/* Which door this is. The action re-reads it and will not let an
          account through the wrong one. */}
      {/* Worth being clear-eyed about: a hidden input is visible in dev tools
          and can be edited before submitting. That is fine here because the
          server does not trust it — auth.ts validates it against an allowlist
          and checks the account's real role. Never rely on a hidden field to
          enforce anything. */}
      <input type="hidden" name="door" value={door} />

      <div>
        {/* `t()` called with a ternary INSIDE it, so only one string is
            looked up rather than translating both and discarding one. */}
        <h1 className={styles.title}>
          {t(isMember ? "auth.memberTitle" : "auth.partnerTitle")}
        </h1>
        <p className={styles.subtitle}>
          {t(isMember ? "auth.memberSubtitle" : "auth.partnerSubtitle")}
        </p>
      </div>

      {/* The error returned by the action last time it ran. No useState
          involved — the value came back from the server through
          useActionState.

          `role="alert"` makes a screen reader announce the message the moment
          it appears. Without it, a sighted user sees the error and a blind
          user gets nothing at all: focus does not move, so nothing is read. */}
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <div>
        {/* `htmlFor` is JSX's name for the HTML `for` attribute — renamed
            because `for` is a reserved word in JavaScript. It must match the
            input's `id`, and that pairing is what lets someone tap the label
            to focus the field, and what makes a screen reader announce the
            field's name. Same reason `class` became `className`. */}
        <label className={styles.label} htmlFor="identifier">
          {t("auth.identifierLabel")}
        </label>
        <input
          id="identifier"
          // `name` is what the server reads: this becomes
          // `formData.get("identifier")` in the action. `id` is for the
          // label; `name` is for the submission. Both are needed.
          name="identifier"
          type="text"
          // Tells a password manager which field this is, so it can offer to
          // fill it. Costs nothing and materially improves sign-in.
          autoComplete="username"
          // Native browser validation — the form will not submit while empty.
          // A first line of defence only; the action re-checks, because
          // anything client-side can be bypassed.
          required
          autoFocus
          placeholder={t(isMember ? "auth.memberPlaceholder" : "auth.partnerPlaceholder")}
          className={styles.input}
          // Forced left-to-right even in Arabic: usernames and phone numbers
          // are Latin characters and digits, which the bidi algorithm would
          // otherwise reorder as you type. See packages/i18n/src/direction.ts.
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
          // Masks the input. It also stops the value appearing in the URL and
          // signals to browsers and password managers what this field is.
          type="password"
          // "current-password", not "new-password" — the distinction tells a
          // password manager whether to offer an existing credential or to
          // generate a fresh one.
          autoComplete="current-password"
          required
          className={styles.input}
          dir="ltr"
        />
      </div>

      {/* `pending` comes from useActionState and is true only while the
          server action is running. It both disables the button — preventing a
          double submission — and swaps the label to a loading message. */}
      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? t("common.loading") : t("auth.signIn")}
      </button>

      <p className={styles.hint}>
        {t(isMember ? "auth.memberDemo" : "auth.partnerDemo")}
      </p>

      {/* The way out when someone is at the wrong door. Emphasised once the
          action has actually told them so. */}
      {/* `state.wrongDoor` is the second field the action can return (see
          AuthState in actions/auth.ts). The link is always present; it merely
          becomes prominent once the server has confirmed this is the problem.
          Showing it loudly from the start would be noise for the majority who
          are at the right door. */}
      <p className={state.wrongDoor ? styles.altStrong : styles.alt}>
        <Link href={otherHref}>{t(isMember ? "auth.toPartner" : "auth.toMember")}</Link>
      </p>
    </form>
  );
}
