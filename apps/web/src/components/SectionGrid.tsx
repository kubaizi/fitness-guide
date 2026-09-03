import Link from "next/link";
import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import styles from "./SectionGrid.module.css";

/**
 * Emad's ten sections, as a marketplace category grid.
 *
 * The order is his mockup's, not the build order — Offers leads, the way a
 * marketplace opens on its deals. His build priority is a separate list, in
 * docs/product-decisions.md.
 *
 * Each card previews its own sub-items, which is what tells a visitor what a
 * section will actually contain. Only gyms is built; the rest carry a "soon"
 * chip and are deliberately NOT links — a tile that looks tappable and does
 * nothing reads as a broken app rather than an unfinished one, and keeping
 * them as plain elements means a keyboard user tabs through exactly the one
 * thing that goes somewhere.
 */

// A DATA-DRIVEN component: the ten tiles are described as data below, and one
// small piece of rendering code at the bottom turns them into markup. Adding a
// section means adding an entry to the array — never touching the JSX.
//
// Compare with writing ten near-identical blocks of markup by hand, where the
// eleventh inevitably differs from the rest in some small way.
interface Section {
  readonly id: string;
  // Typed `TranslationKey`, not `string`, so a mistyped key in the array
  // below is a compile error rather than a blank tile.
  readonly name: TranslationKey;
  readonly items: readonly TranslationKey[];
  /** Where it goes, if it goes anywhere yet. */
  // OPTIONAL (`?`), and its presence is the flag for "this section is built".
  // The render code checks `s.href` to decide between a link and a dead tile,
  // so there is no separate `isLive` boolean that could contradict it.
  readonly href?: string;
  // `React.ReactNode` — the icon is stored as rendered JSX, not as a string.
  // Elements are ordinary values, so they can live in a data array like this.
  readonly icon: React.ReactNode;
}

/* Hand-authored 24×24 line art, stroked in currentColor so each icon takes
   the tile's colour in both the live and the dimmed state. */
// ── `(...d: readonly string[])` — REST PARAMETERS ──
// The `...` collects however many arguments are passed into an array named
// `d`. So `icon("M4 10v4", "M7 8v8")` gives `d = ["M4 10v4", "M7 8v8"]`.
//
// It exists so each icon below can be written as `icon(path, path, path)`
// rather than `icon(["path", "path", "path"])` — the same shortening that
// lets `Math.min(1, 2, 3)` take loose arguments.
//
// Note this is a plain function returning JSX, not a component: it is called
// as `icon(...)`, not rendered as `<Icon/>`. Both are valid; a component
// would be the right choice if it needed props or state.
const icon = (...d: readonly string[]) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
    {/* `key={path}` uses the path string itself as the identity, since these
        have no id. Valid because the paths within one icon are distinct. */}
    {d.map((path) => (
      <path key={path} d={path} />
    ))}
  </svg>
);

const SECTIONS: readonly Section[] = [
  {
    id: "offers",
    name: "sections.offers",
    items: [
      "sections.offers1",
      "sections.offers2",
      "sections.offers3",
      "sections.offers4",
    ],
    icon: icon(
      "M12.5 3H4v8.5L12.5 20l7.5-7.5L12.5 3z",
      "M7.6 7.6a.9.9 0 1 0 1.3 1.3.9.9 0 0 0-1.3-1.3z",
    ),
  },
  {
    id: "gyms",
    name: "sections.gyms",
    items: ["sections.gyms1", "sections.gyms2", "sections.gyms3", "sections.gyms4"],
    href: "gyms",
    icon: icon("M4 10v4", "M7 8v8", "M7 12h10", "M17 8v8", "M20 10v4"),
  },
  {
    id: "trainers",
    name: "sections.trainers",
    items: [
      "sections.trainers1",
      "sections.trainers2",
      "sections.trainers3",
      "sections.trainers4",
    ],
    icon: icon("M12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6z", "M5.5 20a6.5 6.5 0 0 1 13 0"),
  },
  {
    id: "equipment",
    name: "sections.equipment",
    items: ["sections.equipment1", "sections.equipment2", "sections.equipment3"],
    icon: icon("M3 18h13", "M6 18l2.5-8H15", "M15 10V5", "M12.5 3.5h5.5V6h-5.5z"),
  },
  {
    id: "doctors",
    name: "sections.doctors",
    items: ["sections.doctors1", "sections.doctors2", "sections.doctors3"],
    icon: icon("M4 8h16v11H4z", "M9 8V6h6v2", "M12 11v5", "M9.5 13.5h5"),
  },
  {
    id: "labs",
    name: "sections.labs",
    items: ["sections.labs1", "sections.labs2", "sections.labs3"],
    icon: icon(
      "M10 3h4",
      "M11 3v6l-4.8 8.2A1.5 1.5 0 0 0 7.5 19.5h9a1.5 1.5 0 0 0 1.3-2.3L13 9V3",
      "M8.6 15h6.8",
    ),
  },
  {
    id: "sportswear",
    name: "sections.sportswear",
    items: ["sections.sportswear1", "sections.sportswear2", "sections.sportswear3"],
    icon: icon(
      "M9.5 4 4.5 6.8 6.5 10.3 8 9.5V20h8V9.5l1.5.8 2-3.5L14.5 4",
      "M9.5 4a2.5 2.5 0 0 0 5 0",
    ),
  },
  {
    id: "restaurants",
    name: "sections.restaurants",
    items: [
      "sections.restaurants1",
      "sections.restaurants2",
      "sections.restaurants3",
      "sections.restaurants4",
    ],
    icon: icon(
      "M4 11h16a8 8 0 0 1-16 0z",
      "M8.5 19h7",
      "M12 4.5c-2 0-3 1.5-3 3h6c0-1.5-1-3-3-3",
    ),
  },
  {
    id: "supplements",
    name: "sections.supplements",
    items: [
      "sections.supplements1",
      "sections.supplements2",
      "sections.supplements3",
      "sections.supplements4",
    ],
    icon: icon(
      "M9.5 3h5v3h-5z",
      "M8.5 6h7v13a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2z",
      "M12 11v5",
      "M9.5 13.5h5",
    ),
  },
  {
    id: "complaints",
    name: "sections.complaints",
    items: [
      "sections.complaints1",
      "sections.complaints2",
      "sections.complaints3",
      "sections.complaints4",
    ],
    icon: icon(
      "M20 15a2 2 0 0 1-2 2H8.5L4.5 20.5V5a2 2 0 0 1 2-2H18a2 2 0 0 1 2 2z",
      "M8.5 10h1",
      "M11.5 10h1",
      "M14.5 10h1",
    ),
  },
];

export function SectionGrid({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);

  return (
    <div className={styles.grid}>
      {SECTIONS.map((s) => {
        // The tile's CONTENTS, built once and used in both branches below.
        // Without this, the link version and the plain-div version would each
        // repeat the same markup — and would drift apart the first time one
        // of them was edited.
        //
        // Storing JSX in a variable like this is the standard way to share
        // markup between two different wrappers.
        const body = (
          <>
            <div className={styles.head}>
              {s.icon}
              <span className={styles.name}>{t(s.name)}</span>
            </div>

            <ul className={styles.items}>
              {s.items.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>

            {/* The same `s.href` check drives both the styling and the
                wording, so a tile can never look live but read "soon". */}
            <span className={s.href ? styles.live : styles.soon}>
              {t(s.href ? "sections.available" : "sections.soon")}
            </span>
          </>
        );

        // ── Two different ELEMENTS, same contents ──
        // A built section is a <Link> and is tappable; an unbuilt one is a
        // plain <div> and is not.
        //
        // This is the accessibility point from the header comment made
        // concrete. A <div> is not focusable and not announced as a link, so
        // a keyboard user tabs straight past the nine unfinished tiles to the
        // one that works. Rendering them all as links and disabling nine with
        // CSS would look identical and behave far worse.
        //
        // `key` goes on the OUTERMOST element returned by the map — on the
        // Link and the div, not inside `body`.
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
