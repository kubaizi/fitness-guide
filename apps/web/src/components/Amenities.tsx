import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import styles from "./Amenities.module.css";

/**
 * The tick-list of facilities on a gym's page — sauna, parking, and so on.
 *
 * `items` holds KEYS ("sauna", "parking"), not display text. The gym's JSON
 * record stores keys so the same gym reads correctly in both languages;
 * translating them is this component's job.
 */
export function Amenities({
  items,
  locale,
}: {
  items: readonly string[];
  locale: Locale;
}) {
  const t = createTranslator(locale);

  return (
    // A real <ul>/<li>, not a stack of divs. Screen readers announce "list, 6
    // items" and let the user skip it — semantics a div cannot provide.
    <ul className={styles.list}>
      {items.map((key) => (
        // `key={key}` is React's list key (see the note in
        // app/[locale]/page.tsx); the name collision with the amenity key is
        // a coincidence. The amenity string is unique within a gym, so it
        // serves the purpose.
        <li key={key} className={styles.item}>
          <svg className={styles.tick} viewBox="0 0 16 16" aria-hidden="true">
            {/* `fill="none"` with a stroke draws the tick as a line rather
                than a filled shape. In JSX these SVG attributes keep their
                HTML names, but hyphenated ones become camelCase:
                stroke-width → strokeWidth, stroke-linecap → strokeLinecap. */}
            <path
              d="M3 8.5l3.2 3.2L13 5"
              fill="none"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          {/* A dynamically-built translation key, cast because it is
              assembled at runtime — the same situation as Rating.tsx, where
              the reasoning is spelled out in full. An amenity key with no
              matching dictionary entry throws in development. */}
          {t(`amenity.${key}` as TranslationKey)}
        </li>
      ))}
    </ul>
  );
}
