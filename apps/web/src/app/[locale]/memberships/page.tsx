import Link from "next/link";
import { notFound } from "next/navigation";
import type { Membership } from "@fg/core";
import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator, formatDate, isLocale } from "@fg/i18n";
import { getMyMembershipsWithDetails } from "@/lib/memberships";
import { requireUser } from "@/lib/dal";
import { Badge } from "@/components/Badge";
import { Price } from "@/components/Price";
import styles from "./page.module.css";

/**
 * Maps each membership state to its label and tone.
 *
 * Written as a switch on `status.state` so TypeScript checks exhaustiveness:
 * add a new state to the union in @fg/core and this stops compiling until it
 * is handled here. That is the whole point of the discriminated union.
 */
function describe(status: Membership["status"]): {
  key: TranslationKey;
  tone: "ok" | "warn" | "neutral";
} {
  switch (status.state) {
    case "active":
      return { key: "membership.active", tone: "ok" };
    case "pending_payment":
      return { key: "membership.pendingPayment", tone: "warn" };
    case "frozen":
      return { key: "membership.frozen", tone: "warn" };
    case "expired":
      return { key: "membership.expired", tone: "neutral" };
    case "cancelled":
      return { key: "membership.cancelled", tone: "neutral" };
  }
}

/** The end date, where the state has one. Not every state does. */
function endDateOf(status: Membership["status"]): string | null {
  switch (status.state) {
    case "active":
      return status.endsOn;
    case "expired":
      return status.endedOn;
    default:
      return null;
  }
}

// C-31: the member's own memberships.
export default async function MembershipsPage({
  params,
}: PageProps<"/[locale]/memberships">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const t = createTranslator(locale);

  // Redirects to login when signed out. The data layer checks again anyway.
  await requireUser(locale);
  const items = await getMyMembershipsWithDetails();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{t("membership.title")}</h1>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{t("membership.none")}</p>
          <p className={styles.emptyHint}>{t("membership.noneHint")}</p>
          <Link href={`/${locale}/explore`} className={styles.browse}>
            {t("membership.browseGyms")}
          </Link>
        </div>
      ) : (
        <ul className={styles.list}>
          {items.map(({ membership: m, gymName, planName }) => {
            const { key, tone } = describe(m.status);
            const endsOn = endDateOf(m.status);
            const isActive = m.status.state === "active";

            return (
              <li key={m.id}>
                <Link href={`/${locale}/memberships/${m.id}`} className={styles.row}>
                  <div className={styles.rowMain}>
                    <div className={styles.rowTop}>
                      <span className={styles.gymName}>{gymName[locale]}</span>
                      <Badge tone={tone}>{t(key)}</Badge>
                    </div>
                    <span className={styles.planName}>
                      {planName[locale]} ·{" "}
                      <Price amount={m.pricePaid} locale={locale} size="sm" />
                    </span>
                    {endsOn && (
                      <span className={styles.dates}>
                        {t("membership.expiresOn")} {formatDate(endsOn, locale)}
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <span className={styles.cta}>{t("membership.showQr")}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
