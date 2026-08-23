"use client";

import { useActionState } from "react";
import type { Governorate } from "@fg/core";
import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { saveGymProfile, type EditState } from "@/app/actions/gym";
import type { GymDetail } from "@/lib/db";
import styles from "./ManageForm.module.css";

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

const ACCESS = ["men", "women", "mixed", "separate_sections"] as const;
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
