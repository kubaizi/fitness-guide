import Link from "next/link";
import { notFound } from "next/navigation";
import { subtract } from "@fg/core";
import { createTranslator, formatDate, isLocale } from "@fg/i18n";
import { findPlanWithGym } from "@/lib/db";
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

  // One call returning both the plan and its gym — see `findPlanWithGym` in
  // lib/db.ts. Two separate lookups would need two null checks and could, in
  // principle, disagree with each other.
  const found = await findPlanWithGym(planId);
  if (!found) notFound();
  // Destructured only AFTER the null check, which is what makes both names
  // non-null for the rest of the function.
  const { plan, gym } = found;

  const t = createTranslator(locale);

  const hasOffer = plan.offerPrice !== null;
  const total = plan.offerPrice ?? plan.listPrice;
  // All arithmetic in fils, using @fg/core's helpers rather than raw `-`.
  // See PlanCard.tsx, which does the same calculation for the same reasons.
  const discount = hasOffer ? subtract(plan.listPrice, plan.offerPrice) : null;

  // `new Date()` in a SERVER component is safe — it runs once, on the server,
  // and its result is baked into the HTML. The same line in a client
  // component would produce a hydration mismatch, since the server and the
  // browser would evaluate it at different moments.
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

          {/* ── `<dl>`, `<dt>`, `<dd>` — a DESCRIPTION LIST ──
              The right element for label/value pairs like a receipt.
                dl = the list
                dt = the term (the label)
                dd = the description (the value)
              A screen reader announces them as pairs, so "Subtotal, 19.900"
              arrives as one fact rather than two stray numbers. A grid of
              divs would look identical and convey none of that. */}
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
                  {/* A real minus sign (U+2212), not a hyphen. Slightly wider
                      and vertically centred against the digits — the typographic
                      detail that makes a figure look designed rather than typed. */}
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
          {/* The one interactive part of this page, and the only component
              here that ships JavaScript. Everything above is static server
              output. */}
          <PaymentMethods locale={locale} planId={plan.id} />
          <p className={styles.secured}>{t("checkout.securedNote")}</p>
          {/* Says plainly that no card will be charged. Being honest about an
              unfinished payment flow costs nothing and prevents someone
              believing they have bought a membership. */}
          <p className={styles.demo}>{t("checkout.demoNote")}</p>
        </aside>
      </div>
    </main>
  );
}
