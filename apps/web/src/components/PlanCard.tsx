import Link from "next/link";
import { subtract } from "@fg/core";
import type { MembershipPlan } from "@fg/core";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { Price } from "./Price";
import styles from "./PlanCard.module.css";

export function PlanCard({ plan, locale }: { plan: MembershipPlan; locale: Locale }) {
  const t = createTranslator(locale);
  const hasOffer = plan.offerPrice !== null;
  const effective = plan.offerPrice ?? plan.listPrice;

  // Arithmetic stays in fils. Never subtract formatted strings.
  const saving = hasOffer ? subtract(plan.listPrice, plan.offerPrice) : null;

  return (
    <article className={`${styles.card} ${hasOffer ? styles.featured : ""}`}>
      <header className={styles.head}>
        <h3 className={styles.name}>{plan.name[locale]}</h3>
        {hasOffer && <span className={styles.tag}>{t("plan.exclusive")}</span>}
      </header>

      <div className={styles.prices}>
        <Price amount={effective} locale={locale} size="lg" />
        {hasOffer && <Price amount={plan.listPrice} locale={locale} size="sm" strike />}
      </div>

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
