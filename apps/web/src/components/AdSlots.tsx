import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import styles from "./AdSlots.module.css";

/**
 * The advertising strip.
 *
 * Emad's mockup fills this with Nike and other real brand logos. We cannot use
 * those without written permission from each company, and he agreed the slots
 * should carry the word "إعلان" with no image until a real advertiser buys
 * one — so that is exactly what this renders.
 *
 * Deliberately dashed and empty rather than filled with invented brands: a
 * placeholder that looks like a real advertiser would misrepresent who has
 * signed up, to Emad as much as to anyone else.
 */
export function AdSlots({ locale, count = 4 }: { locale: Locale; count?: number }) {
  const t = createTranslator(locale);

  return (
    <div className={styles.strip} aria-label={t("ads.empty")}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.slot}>
          <span className={styles.label}>{t("ads.label")}</span>
          <span className={styles.empty}>{t("ads.empty")}</span>
        </div>
      ))}
    </div>
  );
}
