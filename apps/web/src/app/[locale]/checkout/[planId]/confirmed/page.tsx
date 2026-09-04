import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator, isLocale } from "@fg/i18n";
import { findPlanWithGym } from "@/lib/db";
import { findMembershipForGym } from "@/lib/db";
import { Price } from "@/components/Price";
import styles from "./page.module.css";

// C-29: purchase confirmed. Shows the receipt and routes straight to the QR
// card, which is the thing the member actually needs next.
//
// The deepest route in the app:
//   app/[locale]/checkout/[planId]/confirmed/page.tsx
//   → /ar/checkout/plan_3/confirmed
// Two dynamic segments and two static ones. Nesting folders is the whole of
// routing in the App Router.
export default async function ConfirmedPage({
  params,
}: PageProps<"/[locale]/checkout/[planId]/confirmed">) {
  const { locale: raw, planId } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const found = await findPlanWithGym(planId);
  if (!found) notFound();
  const { plan, gym } = found;

  const t = createTranslator(locale);
  const total = plan.offerPrice ?? plan.listPrice;

  // Until purchases persist, link to the seeded membership for this gym if
  // there is one, so the card screen has something real to render.
  //
  // A scaffold, honestly labelled. Once payment creates a real membership,
  // this becomes a lookup of the membership that was just created — and the
  // `{membership && ...}` guards below already handle its absence.
  const membership = await findMembershipForGym(gym.id);

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        {/* Decorative tick, hidden from screen readers — the heading below
            already says the purchase succeeded. */}
        <div className={styles.tick} aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="22" fill="none" strokeWidth="2" />
            <path
              d="M14 24.5l7 7 13-14"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h1 className={styles.title}>{t("confirmation.title")}</h1>
        <p className={styles.subtitle}>{t("confirmation.subtitle")}</p>

        {/* A description list again — the receipt is label/value pairs. See
            the fuller note in ../page.tsx. */}
        <dl className={styles.receipt}>
          <div className={styles.row}>
            <dt>{gym.name[locale]}</dt>
            <dd>{plan.name[locale]}</dd>
          </div>
          <div className={styles.row}>
            <dt>{t("checkout.total")}</dt>
            <dd>
              <Price amount={total} locale={locale} />
            </dd>
          </div>
          {/* The reference only appears when there is a membership to
              reference. Better than showing an empty row or a fake number. */}
          {membership && (
            <div className={styles.row}>
              <dt>{t("confirmation.reference")}</dt>
              {/* Uppercased for legibility when read aloud at a desk. */}
              <dd className={styles.ref}>{membership.id.toUpperCase()}</dd>
            </div>
          )}
        </dl>

        <div className={styles.actions}>
          {/* The primary action is conditional; the secondary one always
              exists. So there is never a dead end — the page always offers at
              least one way onward. */}
          {membership && (
            <Link
              href={`/${locale}/memberships/${membership.id}`}
              className={styles.primary}
            >
              {t("confirmation.viewCard")}
            </Link>
          )}
          <Link href={`/${locale}`} className={styles.secondary}>
            {t("confirmation.backHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
