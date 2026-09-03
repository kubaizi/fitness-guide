"use client";

import { useMemo, useState } from "react";
import { admits, type AccessFilter, type Governorate } from "@fg/core";
import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator, formatNumber, pluralForm } from "@fg/i18n";
import type { GymDetail } from "@/lib/db";
import { GymCard } from "./GymCard";
import styles from "./ExploreBrowser.module.css";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Search, filter and sort the gym list — entirely in the browser.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── The architecture, and why it is worth noticing ──
 * The gyms are fetched ON THE SERVER by explore/page.tsx and passed in as a
 * prop. This component never fetches anything. Filtering happens in memory as
 * you type, so it is instant — no request per keystroke, no loading spinner.
 *
 * That works because the dataset is small. With ten thousand gyms the
 * filtering would have to move back to the server, and the search box would
 * need debouncing. Knowing WHICH of those two designs you are building is the
 * decision; this one is deliberate, not accidental.
 */

// `"all" | AccessFilter` — the domain's three choices plus an "everything"
// option that exists only in the UI. Extending a domain type with a
// presentation-only case, rather than polluting @fg/core with it.
type AccessChoice = "all" | AccessFilter;
type GovFilter = "all" | Governorate;
type Sort = "price" | "rating";

// `Record<Governorate, TranslationKey>` requires an entry for all six
// governorates and checks each value is a real translation key. Adding a
// seventh governorate to the domain breaks this line until it is translated.
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
  initialQuery = "",
}: {
  gyms: readonly GymDetail[];
  locale: Locale;
  /** Seeded from ?q= in the URL, so arriving from the home page's search box
   *  lands on results rather than an empty box. */
  initialQuery?: string;
}) {
  const t = createTranslator(locale);

  // Four independent pieces of state, one per control. Keeping them separate
  // rather than in one object means each setter updates exactly one thing.
  const [query, setQuery] = useState(initialQuery);
  const [gov, setGov] = useState<GovFilter>("all");
  const [access, setAccess] = useState<AccessChoice>("all");
  const [sort, setSort] = useState<Sort>("price");

  // ── `useMemo(fn, deps)` — cache an expensive calculation ──
  //
  // Recomputes only when something in `deps` changes; otherwise it returns
  // the previous result. Without it, this would re-run on EVERY render,
  // including renders caused by unrelated state.
  //
  // Only the governorates that actually have gyms — an empty filter option
  // that always returns nothing is worse than no option at all.
  //
  // `new Set(...)` removes duplicates, and the spread `[...]` turns the Set
  // back into an array so it can be mapped over in JSX.
  const availableGovs = useMemo(
    () => [...new Set(gyms.map((g) => g.governorate))],
    [gyms],
  );

  // ── DERIVED STATE — the most important pattern in this file ──
  //
  // `results` is COMPUTED from the gyms and the four filters. It is not
  // stored in its own useState, and nothing "keeps it in sync".
  //
  // The tempting alternative — a `const [results, setResults] = useState()`
  // plus a `useEffect` that recomputes when a filter changes — is a classic
  // React mistake. It renders twice per change, and the two can fall out of
  // step. If a value can be calculated from what you already have, calculate
  // it during render.
  //
  // useMemo here is only an optimisation. Delete it and the app still behaves
  // identically, just doing more work.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = gyms.filter((g) => {
      // A chain of early `false` returns. Cheapest checks first, so an
      // excluded gym is discarded before the string comparisons run.
      if (gov !== "all" && g.governorate !== gov) return false;
      // The subtle rule from @fg/core lives in `admits`, not here — see
      // packages/core/src/domain/gym.ts. A plain `g.access === access` would
      // reintroduce the bug where separate-section gyms vanish from both filters.
      if (access !== "all" && !admits(g.access, access)) return false;
      if (q === "") return true;
      // Match either language, so an Arabic search finds an English name too.
      // Both sides lowercased, so the match is case-insensitive.
      return (
        g.name.ar.toLowerCase().includes(q) ||
        g.name.en.toLowerCase().includes(q) ||
        g.area.ar.toLowerCase().includes(q) ||
        g.area.en.toLowerCase().includes(q)
      );
    });

    // `[...filtered]` copies before sorting, because `.sort()` MUTATES.
    // Strictly the filter already produced a new array, so the copy is
    // belt-and-braces — but it makes the intent obvious and survives someone
    // later removing the filter step.
    return [...filtered].sort((a, b) => {
      // `?? -1` parks unrated gyms below every rated one. Using 0 would tie
      // them with a genuine zero rating; -1 is unreachable, so it sorts last.
      if (sort === "rating") return (b.rating ?? -1) - (a.rating ?? -1);
      // Ascending price (`a - b`). Gyms with no plans sort to the top at 0,
      // which is arguably wrong but is at least predictable.
      return (a.startingPrice ?? 0) - (b.startingPrice ?? 0);
    });
    // The dependency array. Miss one of these and the list would go stale —
    // showing results for a filter the user has since changed.
  }, [gyms, query, gov, access, sort]);

  // Also derived, and cheap enough not to bother memoising.
  const isFiltered = query !== "" || gov !== "all" || access !== "all";

  // Note `sort` is deliberately NOT reset. Clearing filters means "show me
  // everything again", not "forget how I wanted it ordered".
  const clear = () => {
    setQuery("");
    setGov("all");
    setAccess("all");
  };

  return (
    <>
      <div className={styles.controls}>
        {/* ── A CONTROLLED INPUT ──
            `value={query}` and `onChange={...setQuery}` together mean React
            state is the single source of truth for what is in the box. The
            input displays state; typing updates state; the new state
            re-renders the input.

            Give it a `value` without an `onChange` and the field becomes
            read-only — you type and nothing appears. That is the number one
            confusion with React forms.

            `e.target.value` is the DOM event's current text. */}
        <input
          type="search"
          className={styles.search}
          placeholder={t("explore.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // The placeholder is not an accessible name — it disappears once
          // typing starts. This field has no visible <label>, so aria-label
          // supplies the name a screen reader announces.
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
          {/* Mapping over a literal array rather than writing four buttons.
              `as const` makes the elements exact string literals, so `a` is
              typed as the union and `ACCESS_KEY[a]` type-checks. */}
          {(["all", "men", "women", "mixed"] as const).map((a) => (
            <button
              key={a}
              type="button"
              className={a === access ? styles.accessOn : styles.access}
              // `aria-pressed` marks a TOGGLE button as on or off. The
              // styling shows it visually; this conveys the same state to a
              // screen reader.
              aria-pressed={a === access}
              onClick={() => setAccess(a)}
            >
              {t(a === "all" ? "explore.filterAll" : ACCESS_KEY[a])}
            </button>
          ))}
        </div>

        <div className={styles.selects}>
          {/* The <select> is wrapped INSIDE the <label>, which associates the
              two without needing matching id/htmlFor attributes. Both
              approaches are valid HTML; wrapping is less to keep in sync. */}
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("explore.filterArea")}</span>
            <select
              className={styles.select}
              value={gov}
              // The cast is needed because the DOM types `e.target.value` as
              // plain `string` — it cannot know the option values are limited
              // to the GovFilter union. Safe here because this component
              // renders every option itself.
              onChange={(e) => setGov(e.target.value as GovFilter)}
            >
              <option value="all">{t("explore.filterAll")}</option>
              {/* Only the governorates that actually have gyms, from the
                  memo above. */}
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
          {/* Arabic pluralisation on a live count — the form changes as you
              filter, which is exactly why the six-form logic in
              packages/i18n/src/plural.ts is not optional. */}
          {t(`explore.results.${pluralForm(results.length, locale)}` as TranslationKey)}
        </span>
        {/* The clear button appears only when there is something to clear. */}
        {isFiltered && (
          <button type="button" className={styles.clear} onClick={clear}>
            {t("explore.clearFilters")}
          </button>
        )}
      </div>

      {/* A ternary rather than `&&`, because there are two real branches:
          the empty state and the grid. */}
      {results.length === 0 ? (
        // A designed empty state with a hint, not a bare "no results". The
        // hint tells the user what to try next, which is the difference
        // between a dead end and a next step.
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{t("explore.noResults")}</p>
          <p className={styles.emptyHint}>{t("explore.noResultsHint")}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {/* GymCard is a SERVER component being rendered inside a CLIENT
              one. That is allowed here because it was imported into a client
              module, so React compiles it as part of this client bundle — it
              takes only plain data as props and holds no server-only code,
              which is what makes that safe. */}
          {results.map((gym) => (
            <GymCard key={gym.id} gym={gym} locale={locale} />
          ))}
        </div>
      )}
    </>
  );
}
