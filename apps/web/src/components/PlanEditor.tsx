"use client";

import { useActionState } from "react";
import { toDecimalString } from "@fg/core";
import type { MembershipPlan } from "@fg/core";
import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { savePlan, type EditState } from "@/app/actions/gym";
import styles from "./ManageForm.module.css";

const DURATION_KEY: Record<MembershipPlan["duration"], TranslationKey> = {
  day_pass: "plan.dayPass",
  monthly: "plan.monthly",
  quarterly: "plan.quarterly",
  half_yearly: "plan.halfYearly",
  yearly: "plan.yearly",
};

/**
 * G-10 — one plan, one form.
 *
 * Each plan saves independently rather than as one giant form, so a mistake
 * in one price cannot block saving a correction to another.
 */
// ═══════════════════════════════════════════════════════════════════════════
// CONTROLLED vs UNCONTROLLED INPUTS — the contrast worth learning here.
//
// ExploreBrowser.tsx uses CONTROLLED inputs:
//     <input value={query} onChange={e => setQuery(e.target.value)} />
//   React state holds the value. Every keystroke re-renders. Necessary there,
//   because the list must filter as you type.
//
// This form uses UNCONTROLLED inputs:
//     <input name="listPrice" defaultValue="19.900" />
//   The BROWSER holds the value. React sets the starting text and then leaves
//   the field alone; no state, no re-render per keystroke. On submit, the
//   values are collected into FormData and posted to the Server Action.
//
// Which to choose:
//   • Do you need to react to every keystroke — live filtering, a character
//     counter, enabling a button as they type? → controlled.
//   • Do you only need the values when the form is submitted? → uncontrolled.
//
// Uncontrolled is simpler and faster, and it is the natural fit for Server
// Actions, which read from FormData anyway. Beginners often reach for
// controlled inputs everywhere because that is what the tutorials show;
// for a plain save-on-submit form, this is the better default.
//
// One rule that bites: `defaultValue` is read ONCE, when the field first
// mounts. Changing it later does nothing. Use `value` if you need to change
// what is displayed from code.
// ═══════════════════════════════════════════════════════════════════════════
export function PlanEditor({
  plan,
  slug,
  active,
  locale,
}: {
  plan: MembershipPlan;
  slug: string;
  active: boolean;
  locale: Locale;
}) {
  const t = createTranslator(locale);
  // Same hook as LoginForm — see that file for the full explanation of
  // useActionState and how it replaces fetch + useState.
  const [state, action, pending] = useActionState<EditState, FormData>(savePlan, {});
  const durationLabel = t(DURATION_KEY[plan.duration]);

  return (
    <form action={action} className={styles.card}>
      {/* Three hidden fields carrying context the action needs. `planId` is
          how the action knows WHICH plan this form edits — which is what lets
          each plan on the page be its own independent form. */}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="planId" value={plan.id} />

      <div className={styles.planHead}>
        <p className={styles.section}>{plan.name[locale]}</p>
        {/* The duration is what the plan IS; the name is what the gym calls
            it, and an owner may rename "Monthly" to "Gold". Worth showing —
            but not when the two read identically, as they do in seed data. */}
        {plan.name[locale] !== durationLabel && (
          <span className={styles.planTag}>{durationLabel}</span>
        )}
      </div>

      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>{t("manage.nameAr")}</span>
          {/* `dir="rtl"` on the Arabic field and `dir="ltr"` on the English
              one, so each types in its natural direction regardless of the
              page's language. Without this, typing Arabic into a field on an
              English page puts the cursor in the wrong place. */}
          <input
            name="nameAr"
            className={styles.input}
            defaultValue={plan.name.ar}
            required
            dir="rtl"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t("manage.nameEn")}</span>
          <input
            name="nameEn"
            className={styles.input}
            defaultValue={plan.name.en}
            required
            dir="ltr"
          />
        </label>
      </div>

      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>{t("manage.listPrice")}</span>
          {/* Shown as "19.900" and parsed back to fils on save, so the gym
              never sees or types a raw fils integer. */}
          {/* The round trip: `toDecimalString` turns 19900 fils into "19.900"
              for display, and `parseKwd` in actions/gym.ts turns it back.
              Both live in @fg/core so the conversion is defined once — see
              packages/core/src/money.ts. */}
          <input
            name="listPrice"
            className={`${styles.input} ${styles.price}`}
            defaultValue={toDecimalString(plan.listPrice)}
            // `inputMode="decimal"` asks a phone for the numeric keypad
            // without making this `type="number"` — which would add spinner
            // arrows and reject the formatting we want to control ourselves.
            inputMode="decimal"
            required
          />
          <span className={styles.hint}>{t("manage.priceHint")}</span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t("manage.offerPrice")}</span>
          <input
            name="offerPrice"
            className={`${styles.input} ${styles.price}`}
            // Empty string for "no offer". Note it is NOT `required` — the
            // action treats a blank as null rather than as an error.
            defaultValue={
              plan.offerPrice === null ? "" : toDecimalString(plan.offerPrice)
            }
            inputMode="decimal"
          />
          <span className={styles.hint}>{t("manage.offerHint")}</span>
        </label>
      </div>

      {/* `defaultChecked`, not `defaultValue`, for a checkbox — the
          uncontrolled equivalent of `checked`. Remember from actions/gym.ts
          that an unticked box submits NOTHING, which is why the action tests
          for the key's presence rather than reading a false. */}
      <label className={styles.check}>
        <input type="checkbox" name="active" defaultChecked={active} />
        {t("manage.activePlan")}
      </label>

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? t("common.loading") : t("manage.save")}
        </button>
        {/* A plain "Saved". This used to be two messages, green or amber,
            saying whether the write reached disk or only this server's
            memory — the data lived in JSON files, and on Vercel the filesystem
            is read-only. A real database makes the distinction meaningless. */}
        {state.saved && <span className={styles.ok}>{t("manage.saved")}</span>}
      </div>
    </form>
  );
}
