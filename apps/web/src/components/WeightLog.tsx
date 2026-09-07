"use client";

import { useActionState } from "react";
import type { Locale } from "@fg/i18n";
import { createTranslator, formatDate } from "@fg/i18n";
import { logWeight, removeWeight, type WeightState } from "@/app/actions/profile";
import type { WeightPoint } from "@/lib/db";
import styles from "./ProfileForm.module.css";

/**
 * The member's own weight history.
 *
 * ## Read the note in schema.prisma before changing anything here
 *
 * A record of someone's body over time is health data. The confirmed rule for
 * the medical section is that nobody at Fitness Guide may read it, admins
 * included, so this table is deliberately absent from every admin query and
 * there is no function anywhere that fetches another member's weights.
 *
 * The line under the heading says so on screen. That is not decoration: a
 * member deciding whether to type their weight into a gym marketplace deserves
 * to know the answer without having to ask.
 */
export function WeightLog({
  locale,
  entries,
}: {
  locale: Locale;
  entries: readonly WeightPoint[];
}) {
  const t = createTranslator(locale);
  const [state, action, pending] = useActionState<WeightState, FormData>(logWeight, {});

  // The date box opens on today, which is what someone stepping off the scales
  // wants. Sliced from the ISO string rather than built from the local parts,
  // because <input type="date"> only ever speaks YYYY-MM-DD.
  const today = new Date().toISOString().slice(0, 10);

  /** Grams back to a readable "82.5". */
  // `formatKg` is not in @fg/i18n because weight is not money and has no
  // currency rules — one decimal place is the whole convention.
  const kg = (grams: number) =>
    (grams / 1000).toLocaleString(locale === "ar" ? "ar-KW-u-nu-latn" : "en-GB", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{t("profile.weight")}</h2>
      <p className={styles.privacy}>{t("profile.weightHint")}</p>

      <form action={action} className={styles.weightForm}>
        <input type="hidden" name="locale" value={locale} />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="kg">
            {t("profile.weightKg")}
          </label>
          <input
            id="kg"
            name="kg"
            // `inputMode="decimal"` brings up the numeric keypad with a decimal
            // point on a phone. `type="number"` would too, but it also adds
            // spinner arrows and rejects a comma — and half of Kuwait types
            // "82,5".
            type="text"
            inputMode="decimal"
            required
            placeholder="82.5"
            className={styles.input}
            dir="ltr"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="measuredOn">
            {t("profile.weightDate")}
          </label>
          <input
            id="measuredOn"
            name="measuredOn"
            type="date"
            defaultValue={today}
            max={today}
            className={styles.input}
            dir="ltr"
          />
        </div>

        <button type="submit" className={styles.secondary} disabled={pending}>
          {pending ? t("common.loading") : t("profile.weightAdd")}
        </button>
      </form>

      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      {entries.length === 0 ? (
        <p className={styles.hint}>{t("profile.weightNone")}</p>
      ) : (
        <ul className={styles.weightList}>
          {entries.map((w) => (
            <li key={w.id} className={styles.weightRow}>
              <span className={styles.weightValue}>
                {kg(w.grams)} {t("profile.weightUnit")}
              </span>
              <span className={styles.weightDate}>
                {formatDate(w.measuredOn, locale)}
              </span>

              {/* A plain form per row rather than a button with an onClick.
                  Deleting is a write, so it goes through a Server Action — and
                  a real form still works if the JavaScript has not loaded. */}
              <form action={removeWeight} className={styles.weightDelete}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={w.id} />
                <button type="submit" className={styles.linkBtn}>
                  {t("profile.weightRemove")}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
