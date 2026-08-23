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
  const [state, action, pending] = useActionState<EditState, FormData>(savePlan, {});
  const durationLabel = t(DURATION_KEY[plan.duration]);

  return (
    <form action={action} className={styles.card}>
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
          <input
            name="listPrice"
            className={`${styles.input} ${styles.price}`}
            defaultValue={toDecimalString(plan.listPrice)}
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
            defaultValue={
              plan.offerPrice === null ? "" : toDecimalString(plan.offerPrice)
            }
            inputMode="decimal"
          />
          <span className={styles.hint}>{t("manage.offerHint")}</span>
        </label>
      </div>

      <label className={styles.check}>
        <input type="checkbox" name="active" defaultChecked={active} />
        {t("manage.activePlan")}
      </label>

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? t("common.loading") : t("manage.save")}
        </button>
        {state.saved && (
          <span className={state.storage === "file" ? styles.ok : styles.warn}>
            {state.storage === "file" ? t("manage.saved") : t("manage.savedMemory")}
          </span>
        )}
      </div>
    </form>
  );
}
