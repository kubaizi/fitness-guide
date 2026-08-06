import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator, isLocale } from "@fg/i18n";
import { PLANS, findGym } from "@/lib/gyms";
import { MEMBERSHIPS } from "@/lib/memberships";
import { Price } from "@/components/Price";
import styles from "./page.module.css";

// C-29: purchase confirmed. Shows the receipt and routes straight to the QR
// card, which is the thing the member actually needs next.
export default async function ConfirmedPage({
  params,
}: PageProps<"/[locale]/checkout/[planId]/confirmed">) {
  const { locale: raw, planId } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) notFound();

  const gym = findGym(plan.gymId);
  if (!gym) notFound();

  const t = createTranslator(locale);
  const total = plan.offerPrice ?? plan.listPrice;

  // Until purchases persist, link to the seeded membership for this gym if
  // there is one, so the card screen has something real to render.
  const membership = MEMBERSHIPS.find((m) => m.gymId === gym.id);

  return (
    <main className={styles.main}>
      <div className={styles.card}>
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
          {membership && (
            <div className={styles.row}>
              <dt>{t("confirmation.reference")}</dt>
              <dd className={styles.ref}>{membership.id.toUpperCase()}</dd>
            </div>
          )}
        </dl>

        <div className={styles.actions}>
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
