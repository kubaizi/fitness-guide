import Link from "next/link";
import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import styles from "./SectionGrid.module.css";

/**
 * The eight verticals from the brochure, as a marketplace category grid.
 *
 * This is the shape of the whole product on one screen — the thing a customer
 * sees first in OpenSooq or 4Sale and immediately understands. Only gyms is
 * built; the other seven are labelled "soon" and are deliberately NOT links.
 *
 * A tile that looks tappable and does nothing is worse than an honest one:
 * it reads as a broken app rather than an unfinished one. So the live tile is
 * an anchor and the rest are plain elements — which also means a keyboard user
 * tabs through exactly the one thing that goes anywhere.
 */

interface Section {
  readonly id: string;
  readonly name: TranslationKey;
  readonly desc: TranslationKey;
  /** Where it goes, if it goes anywhere yet. */
  readonly href?: string;
  readonly icon: React.ReactNode;
}

/* Icons are hand-authored 24×24 line art, stroked in currentColor so they
   inherit the tile's colour in both the live and the dimmed state. */
const icon = (d: readonly string[]) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
    {d.map((path) => (
      <path key={path} d={path} />
    ))}
  </svg>
);

const SECTIONS: readonly Section[] = [
  {
    id: "gyms",
    name: "sections.gyms",
    desc: "sections.gymsDesc",
    href: "explore",
    icon: icon(["M4 10v4", "M7 8v8", "M7 12h10", "M17 8v8", "M20 10v4"]),
  },
  {
    id: "trainers",
    name: "sections.trainers",
    desc: "sections.trainersDesc",
    icon: icon(["M12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6z", "M5.5 20a6.5 6.5 0 0 1 13 0"]),
  },
  {
    id: "nutrition",
    name: "sections.nutrition",
    desc: "sections.nutritionDesc",
    icon: icon(["M4 20c0-8 6-14 14-14 0 8-6 14-14 14z", "M4 20l7.5-7.5"]),
  },
  {
    id: "medicine",
    name: "sections.medicine",
    desc: "sections.medicineDesc",
    icon: icon([
      "M12 20s-7-4.6-7-9a3.8 3.8 0 0 1 7-2.2A3.8 3.8 0 0 1 19 11c0 4.4-7 9-7 9z",
      "M8.2 12h2l1-1.6 1.6 3.2 1-1.6h2",
    ]),
  },
  {
    id: "academies",
    name: "sections.academies",
    desc: "sections.academiesDesc",
    icon: icon([
      "M12 5l9 4-9 4-9-4 9-4z",
      "M6.5 11.2V15c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-3.8",
    ]),
  },
  {
    id: "sportswear",
    name: "sections.sportswear",
    desc: "sections.sportswearDesc",
    icon: icon([
      "M9.5 4 4.5 6.8 6.5 10.3 8 9.5V20h8V9.5l1.5.8 2-3.5L14.5 4",
      "M9.5 4a2.5 2.5 0 0 0 5 0",
    ]),
  },
  {
    id: "supplements",
    name: "sections.supplements",
    desc: "sections.supplementsDesc",
    icon: icon([
      "M9.5 3h5v3h-5z",
      "M8.5 6h7v13a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2z",
      "M12 11v5",
      "M9.5 13.5h5",
    ]),
  },
  {
    id: "store",
    name: "sections.store",
    desc: "sections.storeDesc",
    icon: icon(["M6 8h12l1 12H5z", "M9 8V6a3 3 0 0 1 6 0v2"]),
  },
];

export function SectionGrid({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);

  return (
    <div className={styles.grid}>
      {SECTIONS.map((s) => {
        const body = (
          <>
            {s.icon}
            <span className={styles.name}>{t(s.name)}</span>
            <span className={styles.desc}>{t(s.desc)}</span>
            <span className={s.href ? styles.live : styles.soon}>
              {t(s.href ? "sections.available" : "sections.soon")}
            </span>
          </>
        );

        return s.href ? (
          <Link key={s.id} href={`/${locale}/${s.href}`} className={styles.tile}>
            {body}
          </Link>
        ) : (
          <div key={s.id} className={`${styles.tile} ${styles.tileSoon}`}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
