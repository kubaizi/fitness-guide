import type { Locale } from "@fg/i18n";
import { createTranslator, formatNumber } from "@fg/i18n";
import styles from "./Rating.module.css";

/**
 * Renders a rating, or an honest empty state when a gym has none yet.
 * `rating: number | null` from the domain type forces this case to be handled.
 */
export function Rating({
  rating,
  count,
  locale,
}: {
  rating: number | null;
  count: number;
  locale: Locale;
}) {
  const t = createTranslator(locale);

  if (rating === null) {
    return <span className={styles.empty}>{t("gym.noReviews")}</span>;
  }

  return (
    <span className={styles.wrap}>
      <svg className={styles.star} viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z" />
      </svg>
      <b className={styles.value}>{rating.toFixed(1)}</b>
      <span className={styles.count}>
        {formatNumber(count, locale)} {t("gym.reviews")}
      </span>
    </span>
  );
}
