import Link from "next/link";
import { subtract } from "@fg/core";
import type { MembershipPlan } from "@fg/core";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { Price } from "./Price";
import styles from "./PlanCard.module.css";

/**
 * One purchasable plan, on a gym's page.
 *
 * A good illustration of the money rules from packages/core/src/money.ts
 * being applied at the point of display.
 */
export function PlanCard({ plan, locale }: { plan: MembershipPlan; locale: Locale }) {
  const t = createTranslator(locale);
  const hasOffer = plan.offerPrice !== null;
  // The "effective price" rule that appears throughout the app: the offer
  // price when there is one, otherwise the list price.
  const effective = plan.offerPrice ?? plan.listPrice;

  // Arithmetic stays in fils. Never subtract formatted strings.
  //
  // `subtract` from @fg/core rather than a bare `a - b`, because it revalidates
  // and re-brands the result as `Fils` — and throws if the answer would be
  // negative, which here would mean an "offer" that costs more than the list
  // price. That case is also blocked at the source in actions/gym.ts.
  //
  // TypeScript accepts `plan.offerPrice` as non-null inside the ternary
  // because `hasOffer` narrowed it on the line above.
  const saving = hasOffer ? subtract(plan.listPrice, plan.offerPrice) : null;

  return (
    // `<article>` rather than `<div>`: this is a self-contained item that
    // would still make sense lifted out of the page. Choosing the right
    // element is free and helps screen readers and search engines both.
    <article className={`${styles.card} ${hasOffer ? styles.featured : ""}`}>
      <header className={styles.head}>
        <h3 className={styles.name}>{plan.name[locale]}</h3>
        {/* `&&` conditional rendering. Safe with a boolean — the pitfall
            described in GymCard.tsx only applies to numbers, where a 0 would
            be rendered rather than skipped. */}
        {hasOffer && <span className={styles.tag}>{t("plan.exclusive")}</span>}
      </header>

      <div className={styles.prices}>
        {/* The same Price component three times over, varied by props. This
            is what makes small components worth extracting: the KWD
            formatting and bidi handling are solved once and reused. */}
        <Price amount={effective} locale={locale} size="lg" />
        {/* `strike` is a boolean prop written bare — `strike` alone means
            `strike={true}`. It renders the old price crossed out beside the
            offer price. */}
        {hasOffer && <Price amount={plan.listPrice} locale={locale} size="sm" strike />}
      </div>

      {/* `saving !== null` rather than `saving &&`: `saving` is a number, and
          a zero saving would render a literal "0" on the page. Same trap as
          in GymCard.tsx. */}
      {saving !== null && (
        <p className={styles.saving}>
          {t("plan.save")} <Price amount={saving} locale={locale} size="sm" />
        </p>
      )}

      <Link href={`/${locale}/checkout/${plan.id}`} className={styles.cta}>
        {t("plan.choose")}
      </Link>
    </article>
  );
}
