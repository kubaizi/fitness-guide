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

/*
 * The background art: one oversized line drawing per tile, cropped by the
 * tile's own edge.
 *
 * ── Why it exists ──
 * Ten tiles that differ only in four words are hard to scan. A large silhouette
 * gives each section something you recognise BEFORE you read it, which is what
 * a category grid is for.
 *
 * ── Why these particular subjects ──
 * Every one is near-symmetric on the vertical axis, and that is not an
 * accident. The art sits in the corner nearest the tile's outer edge, which
 * `inset-inline-end` moves to the opposite side in Arabic. A directional
 * object — a price tag, a running shoe — would point off the page in one of
 * the two languages. A ticket notched on both sides, a kettlebell, a t-shirt
 * and a centre-tailed speech bubble read the same either way.
 *
 * ── Why it is kept apart from SECTIONS ──
 * A section is defined by its name, its sub-items and whether it is built. The
 * drawing behind it is decoration, and mixing decoration into the data would
 * suggest a tile could not exist without one. Keyed by id, so a missing entry
 * renders nothing rather than breaking.
 */
const art = (...d: readonly string[]) => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className={styles.art}>
    {d.map((path) => (
      <path key={path} d={path} />
    ))}
  </svg>
);

const ART: Record<string, React.ReactNode> = {
  // A ticket, notched on both sides. The marketplace's own object for a deal,
  // and symmetric where a price tag would not be.
  offers: art(
    "M8 14h32v6a4 4 0 0 0 0 8v6H8v-6a4 4 0 0 0 0-8z",
    "M24 18v3",
    "M24 25v3",
    "M24 29v3",
  ),
  // A dumbbell, plates and all. The one section that is actually built gets
  // the most literal drawing in the set.
  //
  // Drawn narrower than it wants to be — x from 11 to 37 rather than the full
  // 48 — because a wide horizontal object loses its identity the moment the
  // tile crops it. The first version bled off both ends and read as a capital
  // H.
  gyms: art("M11 18v12", "M17 12v24", "M17 24h14", "M31 12v24", "M37 18v12"),
  // A stopwatch — a trainer's instrument. Deliberately not a human figure:
  // this platform lists men's, women's and mixed gyms, and a drawn body would
  // pick a side of that for no reason.
  trainers: art(
    "M24 13a16 16 0 1 0 0 32 16 16 0 0 0 0-32z",
    "M20 6h8",
    "M24 6v7",
    "M24 22v8h6",
  ),
  equipment: art(
    "M16 21v-4a8 8 0 0 1 16 0v4",
    "M32 21c5 3 8 9 8 14a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4c0-5 3-11 8-14z",
  ),
  // A doctor's bag, matching the small icon in the tile header.
  doctors: art("M6 17h36v23H6z", "M18 17v-5h12v5", "M24 23v11", "M18.5 28.5h11"),
  // An Erlenmeyer flask, with the liquid line that says "measured".
  labs: art(
    "M19 6h10",
    "M21 6v13L9.5 38A3 3 0 0 0 12 42.5h24A3 3 0 0 0 38.5 38L27 19V6",
    "M14.5 32h19",
  ),
  sportswear: art(
    "M18 8 8 13.5l4 8.5 5-2.5V42h14V19.5l5 2.5 4-8.5L30 8",
    "M18 8a6 6 0 0 0 12 0",
  ),
  // A bowl with steam rising off it.
  //
  // This replaced a plate seen from above with a two-lobed leaf at its centre.
  // On screen the two lobes closed up into a heart, and a heart on a tile means
  // "saved" or "favourite" in every app anyone has used. Meaning the reader
  // already holds beats the meaning you intended.
  //
  // A bowl is also symmetric, where the obvious alternative — a plate with a
  // fork and a knife — would point the wrong way in one of the two languages.
  restaurants: art(
    "M7 25h34a17 17 0 0 1-34 0z",
    "M15 42h18",
    "M18 11v6",
    "M24 8v9",
    "M30 11v6",
  ),
  supplements: art(
    "M17 6h14v6H17z",
    "M15 12h18v26a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4z",
    "M20 22h8",
    "M20 29h8",
  ),
  // The tail is centred rather than in a corner, so it hangs correctly in both
  // reading directions.
  complaints: art(
    "M10 7h28a4 4 0 0 1 4 4v17a4 4 0 0 1-4 4h-9l-5 8-5-8h-9a4 4 0 0 1-4-4V11a4 4 0 0 1 4-4z",
    "M16 19h2",
    "M23 19h2",
    "M30 19h2",
  ),
};

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
            {/* First in the DOM so it sits behind everything — the CSS puts it
                on its own layer, but source order is the honest default. */}
            {ART[s.id]}

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
