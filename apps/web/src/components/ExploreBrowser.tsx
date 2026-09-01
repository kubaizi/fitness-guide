"use client";

import { useMemo, useState } from "react";
import { admits, type AccessFilter, type Governorate } from "@fg/core";
import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator, formatNumber, pluralForm } from "@fg/i18n";
import type { GymDetail } from "@/lib/db";
import { GymCard } from "./GymCard";
import styles from "./ExploreBrowser.module.css";

type AccessChoice = "all" | AccessFilter;
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

/*
 * Three choices, not four. "Separate sections" describes how a building is
 * arranged, not who the member is — someone picking "women" wants somewhere
 * they can train, and admits() puts separate-section gyms under BOTH men and
 * women rather than hiding them from both.
 */
const ACCESS_KEY: Record<AccessFilter, TranslationKey> = {
  men: "access.men",
  women: "access.women",
  mixed: "access.mixed",
};

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
  const [access, setAccess] = useState<AccessChoice>("all");
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
      if (access !== "all" && !admits(g.access, access)) return false;
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

        {/*
          Men / women / mixed is the first thing a member decides in this
          market, so it is a row of buttons rather than the middle dropdown of
          three. Emad asked for it as the primary way into the gyms list.
        */}
        <div
          className={styles.accessRow}
          role="group"
          aria-label={t("explore.filterAccess")}
        >
          {(["all", "men", "women", "mixed"] as const).map((a) => (
            <button
              key={a}
              type="button"
              className={a === access ? styles.accessOn : styles.access}
              aria-pressed={a === access}
              onClick={() => setAccess(a)}
            >
              {t(a === "all" ? "explore.filterAll" : ACCESS_KEY[a])}
            </button>
          ))}
        </div>

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
