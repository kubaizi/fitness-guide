import Link from "next/link";
import { notFound } from "next/navigation";
import type { Locale } from "@fg/i18n";
import { createTranslator, formatDate, isLocale } from "@fg/i18n";
import { membershipsWithDetailsForUser } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { describeStatus, endDateOf } from "@/lib/membership";
import { Badge } from "@/components/Badge";
import { Price } from "@/components/Price";
import styles from "./page.module.css";

// C-31: the member's own memberships.
export default async function MembershipsPage({
  params,
}: PageProps<"/[locale]/memberships">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const t = createTranslator(locale);

  // Redirects to login when signed out. The data layer checks again anyway.
  const user = await requireUser(locale);
  const items = membershipsWithDetailsForUser(user.id);

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
            const { key, tone } = describeStatus(m.status);
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
