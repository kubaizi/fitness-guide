import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import styles from "./Amenities.module.css";

export function Amenities({
  items,
  locale,
}: {
  items: readonly string[];
  locale: Locale;
}) {
  const t = createTranslator(locale);

  return (
    <ul className={styles.list}>
      {items.map((key) => (
        <li key={key} className={styles.item}>
          <svg className={styles.tick} viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M3 8.5l3.2 3.2L13 5"
              fill="none"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          {t(`amenity.${key}` as TranslationKey)}
        </li>
      ))}
    </ul>
  );
}
