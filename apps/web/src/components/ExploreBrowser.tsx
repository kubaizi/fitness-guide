"use client";

import { useMemo, useState } from "react";
import type { Governorate } from "@fg/core";
import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator, formatNumber, pluralForm } from "@fg/i18n";
import type { GymDetail } from "@/lib/db";
import { GymCard } from "./GymCard";
import styles from "./ExploreBrowser.module.css";

type AccessFilter = "all" | GymDetail["access"];
type GovFilter = "all" | Governorate;
type Sort = "price" | "rating";

const GOV_KEY: Record<Governorate, TranslationKey> = {
  capital: "governorate.capital",
  hawalli: "governorate.hawalli",
  farwaniya: "governorate.farwaniya",
  ahmadi: "governorate.ahmadi",
  jahra: "governorate.jahra",
  mubarak_al_kabeer: "governorate.mubarakAlKabeer",
};

const ACCESS_KEY = {
  men: "access.men",
  women: "access.women",
  mixed: "access.mixed",
  separate_sections: "access.separateSections",
} as const;

export function ExploreBrowser({
  gyms,
  locale,
}: {
  gyms: readonly GymDetail[];
  locale: Locale;
}) {
  const t = createTranslator(locale);

  const [query, setQuery] = useState("");
  const [gov, setGov] = useState<GovFilter>("all");
  const [access, setAccess] = useState<AccessFilter>("all");
  const [sort, setSort] = useState<Sort>("price");

  // Only the governorates that actually have gyms — an empty filter option
  // that always returns nothing is worse than no option at all.
  const availableGovs = useMemo(
    () => [...new Set(gyms.map((g) => g.governorate))],
    [gyms],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = gyms.filter((g) => {
      if (gov !== "all" && g.governorate !== gov) return false;
      if (access !== "all" && g.access !== access) return false;
      if (q === "") return true;
      // Match either language, so an Arabic search finds an English name too.
      return (
        g.name.ar.toLowerCase().includes(q) ||
        g.name.en.toLowerCase().includes(q) ||
        g.area.ar.toLowerCase().includes(q) ||
        g.area.en.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sort === "rating") return (b.rating ?? -1) - (a.rating ?? -1);
      return (a.startingPrice ?? 0) - (b.startingPrice ?? 0);
    });
  }, [gyms, query, gov, access, sort]);

  const isFiltered = query !== "" || gov !== "all" || access !== "all";

  const clear = () => {
    setQuery("");
    setGov("all");
    setAccess("all");
  };

  return (
    <>
      <div className={styles.controls}>
        <input
          type="search"
          className={styles.search}
          placeholder={t("explore.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("explore.searchPlaceholder")}
        />

        <div className={styles.selects}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("explore.filterArea")}</span>
            <select
              className={styles.select}
              value={gov}
              onChange={(e) => setGov(e.target.value as GovFilter)}
            >
              <option value="all">{t("explore.filterAll")}</option>
              {availableGovs.map((g) => (
                <option key={g} value={g}>
                  {t(GOV_KEY[g])}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("explore.filterAccess")}</span>
            <select
              className={styles.select}
              value={access}
              onChange={(e) => setAccess(e.target.value as AccessFilter)}
            >
              <option value="all">{t("explore.filterAll")}</option>
              {(Object.keys(ACCESS_KEY) as Array<keyof typeof ACCESS_KEY>).map((a) => (
                <option key={a} value={a}>
                  {t(ACCESS_KEY[a])}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("explore.sortBy")}</span>
            <select
              className={styles.select}
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
            >
              <option value="price">{t("explore.sortPriceLow")}</option>
              <option value="rating">{t("explore.sortRating")}</option>
            </select>
          </label>
        </div>
      </div>

      <div className={styles.resultBar}>
        <span className={styles.count}>
          {formatNumber(results.length, locale)}{" "}
          {t(`explore.results.${pluralForm(results.length, locale)}` as TranslationKey)}
        </span>
        {isFiltered && (
          <button type="button" className={styles.clear} onClick={clear}>
            {t("explore.clearFilters")}
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{t("explore.noResults")}</p>
          <p className={styles.emptyHint}>{t("explore.noResultsHint")}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {results.map((gym) => (
            <GymCard key={gym.id} gym={gym} locale={locale} />
          ))}
        </div>
      )}
    </>
  );
}
