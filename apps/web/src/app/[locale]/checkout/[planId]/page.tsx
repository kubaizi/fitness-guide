import Link from "next/link";
import { notFound } from "next/navigation";
import { subtract } from "@fg/core";
import { createTranslator, formatDate, isLocale } from "@fg/i18n";
import { findPlanWithGym } from "@/lib/gyms";
import { Price } from "@/components/Price";
import { PaymentMethods } from "@/components/PaymentMethods";
import styles from "./page.module.css";

// C-26 + C-27: order summary and payment method.
//
// Kuwait has no VAT, so there is deliberately no tax line here. If that ever
// changes it belongs in @fg/core next to the commission split, not inline.
export default async function CheckoutPage({
  params,
}: PageProps<"/[locale]/checkout/[planId]">) {
  const { locale: raw, planId } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const found = await findPlanWithGym(planId);
  if (!found) notFound();
  const { plan, gym } = found;

  const t = createTranslator(locale);

  const hasOffer = plan.offerPrice !== null;
  const total = plan.offerPrice ?? plan.listPrice;
  const discount = hasOffer ? subtract(plan.listPrice, plan.offerPrice) : null;

  const today = new Date().toISOString();

  return (
    <main className={styles.main}>
      <nav className={styles.crumb}>
        <Link href={`/${locale}/gyms/${gym.slug}`}>{gym.name[locale]}</Link>
        <span aria-hidden="true">/</span>
        <span>{t("checkout.title")}</span>
      </nav>

      <h1 className={styles.title}>{t("checkout.title")}</h1>

      <div className={styles.layout}>
        <section className={styles.summary}>
          <h2 className={styles.cardTitle}>{t("checkout.orderSummary")}</h2>

          <div className={styles.item}>
            <div>
              <p className={styles.gymName}>{gym.name[locale]}</p>
              <p className={styles.planName}>{plan.name[locale]}</p>
            </div>
            <Price amount={plan.listPrice} locale={locale} />
          </div>

          <dl className={styles.lines}>
            <div className={styles.line}>
              <dt>{t("checkout.subtotal")}</dt>
              <dd>
                <Price amount={plan.listPrice} locale={locale} size="sm" muted />
              </dd>
            </div>

            {discount !== null && (
              <div className={styles.line}>
                <dt className={styles.discountLabel}>{t("checkout.discount")}</dt>
                <dd className={styles.discountValue}>
                  −<Price amount={discount} locale={locale} size="sm" />
                </dd>
              </div>
            )}

            <div className={styles.line}>
              <dt>{t("checkout.startDate")}</dt>
              <dd className={styles.startDate}>
                {formatDate(today, locale)} · {t("checkout.startsToday")}
              </dd>
            </div>
          </dl>

          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>{t("checkout.total")}</span>
            <Price amount={total} locale={locale} size="lg" />
          </div>
        </section>

        <aside className={styles.payment}>
          <h2 className={styles.cardTitle}>{t("checkout.paymentMethod")}</h2>
          <PaymentMethods locale={locale} planId={plan.id} />
          <p className={styles.secured}>{t("checkout.securedNote")}</p>
          <p className={styles.demo}>{t("checkout.demoNote")}</p>
        </aside>
      </div>
    </main>
  );
}
