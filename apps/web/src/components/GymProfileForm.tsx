"use client";

import { useActionState } from "react";
import type { Governorate } from "@fg/core";
import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { saveGymProfile, type EditState } from "@/app/actions/gym";
import type { GymDetail } from "@/lib/db";
import styles from "./ManageForm.module.css";

/**
 * The gym's own profile editor — the longest form in the app.
 *
 * It is long but not complicated: the same label/input pair repeated for
 * every field, in Arabic and English. Read one pair and you have read them
 * all. The parts genuinely worth studying are marked below.
 *
 * Uses UNCONTROLLED inputs (`defaultValue`, no state). The contrast with
 * controlled inputs is explained at the top of PlanEditor.tsx — read that
 * first if the distinction is new.
 */

// `Governorate[]` — the ORDER for the dropdown. TypeScript checks every entry
// is a real governorate, but note it does NOT check that all six are present:
// an array can hold any number of them. Compare with the Record below, which
// does require all six.
const GOVERNORATES: Governorate[] = [
  "capital",
  "hawalli",
  "farwaniya",
  "ahmadi",
  "jahra",
  "mubarak_al_kabeer",
];

const GOV_KEY: Record<Governorate, TranslationKey> = {
  capital: "governorate.capital",
  hawalli: "governorate.hawalli",
  farwaniya: "governorate.farwaniya",
  ahmadi: "governorate.ahmadi",
  jahra: "governorate.jahra",
  mubarak_al_kabeer: "governorate.mubarakAlKabeer",
};

// Note this list has FOUR options while ExploreBrowser's filter has three.
// Deliberate, and the distinction matters: a gym describes itself as having
// separate sections, but a member never searches for that — see the comment
// on `AccessFilter` in packages/core/src/domain/gym.ts.
const ACCESS = ["men", "women", "mixed", "separate_sections"] as const;
// `(typeof ACCESS)[number]` derives the union from the array above — the same
// technique as `Locale` in packages/i18n/src/types.ts. So adding a fifth
// option to ACCESS makes this Record demand a fifth translation key.
const ACCESS_KEY: Record<(typeof ACCESS)[number], TranslationKey> = {
  men: "access.men",
  women: "access.women",
  mixed: "access.mixed",
  separate_sections: "access.separateSections",
};

const AMENITIES = [
  "freeWeights",
  "cardio",
  "classes",
  "personalTraining",
  "pool",
  "sauna",
  "lockers",
  "parking",
  "childcare",
] as const;

/** G-07 — the gym's own profile editor. */
export function GymProfileForm({ gym, locale }: { gym: GymDetail; locale: Locale }) {
  const t = createTranslator(locale);
  const [state, action, pending] = useActionState<EditState, FormData>(
    saveGymProfile,
    {},
  );

  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="slug" value={gym.slug} />

      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <div className={styles.card}>
        <p className={styles.section}>{t("manage.sectionIdentity")}</p>

        {/* ── THE PATTERN, ONCE. Every field below repeats it. ──
            • wrapped in a <label>, so clicking the text focuses the input
              (no id/htmlFor pairing needed when the input is inside)
            • `name` is what the Server Action reads back —
              `formData.get("nameAr")` in actions/gym.ts
            • `defaultValue` seeds it; the browser owns it from then on
            • `dir` forces the writing direction per language, so Arabic and
              English fields each behave correctly on either locale's page */}
        <div className={styles.pair}>
          <label className={styles.field}>
            <span className={styles.label}>{t("manage.nameAr")}</span>
            <input
              name="nameAr"
              className={styles.input}
              defaultValue={gym.name.ar}
              required
              dir="rtl"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("manage.nameEn")}</span>
            <input
              name="nameEn"
              className={styles.input}
              defaultValue={gym.name.en}
              required
              dir="ltr"
            />
          </label>
        </div>

        <div className={styles.pair}>
          <label className={styles.field}>
            <span className={styles.label}>{t("manage.descriptionAr")}</span>
            <textarea
              name="descriptionAr"
              className={styles.textarea}
              defaultValue={gym.description.ar}
              dir="rtl"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("manage.descriptionEn")}</span>
            <textarea
              name="descriptionEn"
              className={styles.textarea}
              defaultValue={gym.description.en}
              dir="ltr"
            />
          </label>
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.section}>{t("manage.sectionLocation")}</p>

        <div className={styles.pair}>
          <label className={styles.field}>
            <span className={styles.label}>{t("manage.governorate")}</span>
            {/* `defaultValue` on the <select>, not `selected` on an
                <option> — React handles it at the select level, unlike plain
                HTML. Its value must match one of the option values below. */}
            <select
              name="governorate"
              className={styles.select}
              defaultValue={gym.governorate}
            >
              {GOVERNORATES.map((g) => (
                <option key={g} value={g}>
                  {t(GOV_KEY[g])}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("manage.access")}</span>
            <select name="access" className={styles.select} defaultValue={gym.access}>
              {ACCESS.map((a) => (
                <option key={a} value={a}>
                  {t(ACCESS_KEY[a])}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.pair}>
          <label className={styles.field}>
            <span className={styles.label}>{t("manage.areaAr")}</span>
            <input
              name="areaAr"
              className={styles.input}
              defaultValue={gym.area.ar}
              required
              dir="rtl"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("manage.areaEn")}</span>
            <input
              name="areaEn"
              className={styles.input}
              defaultValue={gym.area.en}
              required
              dir="ltr"
            />
          </label>
        </div>

        <div className={styles.pair}>
          <label className={styles.field}>
            <span className={styles.label}>{t("manage.addressAr")}</span>
            <input
              name="addressAr"
              className={styles.input}
              defaultValue={gym.address.ar}
              dir="rtl"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("manage.addressEn")}</span>
            <input
              name="addressEn"
              className={styles.input}
              defaultValue={gym.address.en}
              dir="ltr"
            />
          </label>
        </div>

        <div className={styles.pair}>
          <label className={styles.field}>
            <span className={styles.label}>{t("manage.hoursAr")}</span>
            <input
              name="hoursAr"
              className={styles.input}
              defaultValue={gym.hours.ar}
              dir="rtl"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("manage.hoursEn")}</span>
            <input
              name="hoursEn"
              className={styles.input}
              defaultValue={gym.hours.en}
              dir="ltr"
            />
          </label>
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.section}>{t("manage.sectionFacilities")}</p>
        {/* ── WORTH STUDYING: many checkboxes sharing ONE name ──
            Every box here is `name="amenities"`. On submit, each TICKED box
            contributes its `value` under that same key, so the action reads
            them with `formData.getAll("amenities")` — plural — rather than
            `.get`, which would return only the first.

            This is plain HTML behaviour, not a React feature, and it is the
            standard way to submit a multi-select. Unticked boxes send
            nothing at all, so the result is exactly the list of chosen
            amenities.

            `defaultChecked={gym.amenities.includes(a)}` ticks the ones the
            gym already has. `.includes()` tests array membership. */}
        <div className={styles.checks}>
          {AMENITIES.map((a) => (
            <label key={a} className={styles.check}>
              <input
                type="checkbox"
                name="amenities"
                value={a}
                defaultChecked={gym.amenities.includes(a)}
              />
              {t(`amenity.${a}` as TranslationKey)}
            </label>
          ))}
        </div>
      </div>

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
