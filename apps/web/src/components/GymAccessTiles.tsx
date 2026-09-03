import Link from "next/link";
import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator, formatNumber } from "@fg/i18n";
import styles from "./GymAccessTiles.module.css";

/**
 * The four tiles that open the gyms section: men, women, mixed, offers.
 *
 * Emad's mockup leads with these, and he confirmed men / women / mixed is the
 * primary way in rather than a filter among filters. Each one is a link that
 * pre-selects the filter below, so the tiles and the list stay one page rather
 * than two screens that have to agree with each other.
 *
 * Counts come from the same data the list uses, so a tile can never advertise
 * gyms that are not there — and an empty one is visibly empty rather than a
 * dead end the member only discovers after tapping.
 */

interface Tile {
  readonly id: string;
  readonly name: TranslationKey;
  readonly desc: TranslationKey;
  /** The query this tile applies, e.g. `access=men`. */
  readonly query: string;
  readonly icon: React.ReactNode;
}

const icon = (...d: readonly string[]) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
    {d.map((path) => (
      <path key={path} d={path} />
    ))}
  </svg>
);

const TILES: readonly Tile[] = [
  {
    id: "men",
    name: "gymsPage.men",
    desc: "gymsPage.menDesc",
    query: "access=men",
    icon: icon("M12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6z", "M6 20a6 6 0 0 1 12 0"),
  },
  {
    id: "women",
    name: "gymsPage.women",
    desc: "gymsPage.womenDesc",
    query: "access=women",
    icon: icon(
      "M12 3a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z",
      "M12 10.5 8.5 19h7L12 10.5z",
      "M9.5 21h5",
    ),
  },
  {
    id: "mixed",
    name: "gymsPage.mixed",
    desc: "gymsPage.mixedDesc",
    query: "access=mixed",
    icon: icon(
      "M8.5 5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z",
      "M15.5 5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z",
      "M3.5 20a5 5 0 0 1 10 0",
      "M13 13.5a5 5 0 0 1 7.5 4.3",
    ),
  },
  {
    id: "offers",
    name: "gymsPage.offers",
    desc: "gymsPage.offersDesc",
    query: "offers=1",
    icon: icon(
      "M12.5 3H4v8.5L12.5 20l7.5-7.5L12.5 3z",
      "M7.6 7.6a.9.9 0 1 0 1.3 1.3.9.9 0 0 0-1.3-1.3z",
    ),
  },
];

export function GymAccessTiles({
  locale,
  counts,
}: {
  locale: Locale;
  /** How many gyms each tile would show, keyed by tile id. */
  counts: Readonly<Record<string, number>>;
}) {
  const t = createTranslator(locale);

  return (
    <div className={styles.grid}>
      {TILES.map((tile) => {
        const n = counts[tile.id] ?? 0;
        return (
          <Link
            key={tile.id}
            href={`/${locale}/gyms?${tile.query}`}
            className={styles.tile}
          >
            {tile.icon}
            <span className={styles.name}>{t(tile.name)}</span>
            <span className={styles.desc}>{t(tile.desc)}</span>
            <span className={styles.count}>
              {formatNumber(n, locale)}{" "}
              {t(n === 1 ? "gymsPage.countOne" : "gymsPage.countMany")}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
