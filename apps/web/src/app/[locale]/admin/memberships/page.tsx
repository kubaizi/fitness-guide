import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator, formatDate, formatNumber, isLocale } from "@fg/i18n";
import { requireAdmin } from "@/lib/dal";
import { adminMemberships } from "@/lib/db";
import { describeStatus, endDateOf, startDateOf } from "@/lib/membership";
import { AdminTabs } from "@/components/AdminTabs";
import { Badge } from "@/components/Badge";
import { Price } from "@/components/Price";
import styles from "../admin.module.css";
import table from "@/components/DataTable.module.css";

/** A-02 — every membership on the platform, across all gyms. */
// The cross-gym counterpart of ../../manage/[slug]/members/page.tsx: same
// shape, with the gymId filter removed and the gym's name added as a column.
//
// Note it reuses the exact same three helpers from lib/membership.ts that the
// gym roster and the member's own list use. Three screens, one definition of
// what "frozen" looks like — which is precisely why those helpers were pulled
// out of the pages in the first place.
//
// Same admin skeleton as ../page.tsx; table markup explained in
// ../../manage/[slug]/members/page.tsx.
export default async function AdminMembershipsPage({
  params,
}: PageProps<"/[locale]/admin/memberships">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  await requireAdmin(locale);

  const t = createTranslator(locale);
  const rows = await adminMemberships();

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t("admin.membershipsTitle")}</h1>
        <p className={styles.subtitle}>{t("admin.membershipsSubtitle")}</p>
      </div>

      <AdminTabs current="memberships" locale={locale} />

      <div className={table.scroll}>
        <table className={table.table}>
          <thead>
            <tr>
              <th>{t("admin.colMember")}</th>
              <th>{t("admin.colGym")}</th>
              <th>{t("admin.colPlan")}</th>
              <th>{t("admin.colStatus")}</th>
              <th>{t("manage.colStarted")}</th>
              <th>{t("manage.colExpires")}</th>
              <th className={table.num}>{t("admin.colAmount")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ membership, memberName, gymName, gymSlug, planName }) => {
              const { key, tone } = describeStatus(membership.status);
              const startsOn = startDateOf(membership.status);
              const endsOn = endDateOf(membership.status);

              return (
                <tr key={membership.id}>
                  <td className={table.name}>{memberName}</td>
                  <td>
                    {/* Straight through to that gym's own dashboard — admin
                        can open any of them, so the name may as well be the
                        way in. */}
                    <Link href={`/${locale}/manage/${gymSlug}`}>{gymName[locale]}</Link>
                  </td>
                  <td>{planName[locale]}</td>
                  <td>
                    <Badge tone={tone}>{t(key)}</Badge>
                  </td>
                  <td>
                    {startsOn ? (
                      formatDate(startsOn, locale)
                    ) : (
                      <span className={table.sub}>—</span>
                    )}
                  </td>
                  <td>
                    {endsOn ? (
                      formatDate(endsOn, locale)
                    ) : (
                      <span className={table.sub}>—</span>
                    )}
                  </td>
                  <td className={table.num}>
                    <Price amount={membership.pricePaid} locale={locale} size="sm" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className={table.count}>
        {t("admin.total")}: {formatNumber(rows.length, locale)}
      </p>
    </main>
  );
}
