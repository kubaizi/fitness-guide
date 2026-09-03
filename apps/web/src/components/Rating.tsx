import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator, formatNumber, pluralForm } from "@fg/i18n";
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
  // The `| null` is doing real work. Because the domain type admits null (see
  // packages/core/src/domain/gym.ts), TypeScript will not let this component
  // call `rating.toFixed(1)` until the null case has been dealt with — which
  // is what forces the early return below to exist.
  rating: number | null;
  count: number;
  locale: Locale;
}) {
  const t = createTranslator(locale);

  // ── EARLY RETURN for the empty state ──
  // A component may return from several places. This is usually clearer than
  // wrapping the whole body in a ternary, and it narrows `rating` to `number`
  // for everything below.
  if (rating === null) {
    return <span className={styles.empty}>{t("gym.noReviews")}</span>;
  }

  return (
    <span className={styles.wrap}>
      {/* SVG is valid JSX — the star is drawn inline rather than loaded as an
          image file, so it needs no extra network request and inherits its
          colour from CSS.

          `aria-hidden="true"` hides it from screen readers. It is decoration:
          the rating number beside it already carries the meaning, and
          announcing "star, 4.5" would just be noise. */}
      <svg className={styles.star} viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z" />
      </svg>
      {/* `.toFixed(1)` formats to exactly one decimal, so 4 renders as "4.0"
          and the column of ratings stays visually aligned. It returns a
          string, not a number. */}
      <b className={styles.value}>{rating.toFixed(1)}</b>
      <span className={styles.count}>
        {formatNumber(count, locale)}{" "}
        {/* ── `{" "}` — an explicit space ──
            JSX collapses whitespace between elements on separate lines, so
            without this the number and the word would be jammed together as
            "12reviews". Writing the space as an expression forces it to
            survive. A very common JSX papercut. */}
        {/* ── Building a translation key dynamically ──
            `pluralForm(count, locale)` returns "one", "few", "many" and so
            on, so this resolves to keys like "gym.reviews.few". Arabic has
            six such forms — see packages/i18n/src/plural.ts.

            The `as TranslationKey` cast is needed because the key is built at
            runtime from a template literal, and TypeScript cannot verify a
            dynamically-assembled string against the union of valid keys. It
            is one of the few places in this codebase where a cast is
            genuinely unavoidable, and the safety net is the dictionary
            integrity test in packages/i18n/src/i18n.test.ts. */}
        {t(`gym.reviews.${pluralForm(count, locale)}` as TranslationKey)}
      </span>
    </span>
  );
}
