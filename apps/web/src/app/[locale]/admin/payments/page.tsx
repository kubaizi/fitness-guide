import { notFound } from "next/navigation";
import { fils } from "@fg/core";
import { createTranslator, formatDate, formatNumber, isLocale } from "@fg/i18n";
import { requireAdmin } from "@/lib/dal";
import { adminPayments } from "@/lib/db";
import { AdminTabs } from "@/components/AdminTabs";
import { Badge } from "@/components/Badge";
import { Price } from "@/components/Price";
import styles from "../admin.module.css";
import table from "@/components/DataTable.module.css";

/** A-04 — the commission ledger: what came in, and who kept what. */
// Same admin skeleton as ../page.tsx; same table markup as
// ../../manage/[slug]/members/page.tsx. The interesting part here is the
// money handling below.
export default async function AdminPaymentsPage({
  params,
}: PageProps<"/[locale]/admin/payments">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  await requireAdmin(locale);

  const t = createTranslator(locale);
  const rows = adminPayments();

  // Totals count only what was actually kept. A refunded payment is not
  // revenue that shrank, it is revenue that never happened.
  //
  // Note this filters the ROWS but the table below renders all of them —
  // refunds stay visible, they just do not count toward the totals. Hiding
  // them would make the ledger disagree with the payment provider's records.
  const settled = rows.filter((p) => p.status === "paid");
  // Summing raw fils integers, so the totals are exact — the whole reason
  // money is stored this way. Summing formatted strings, or floats, would
  // accumulate the error described at the top of packages/core/src/money.ts.
  const gross = settled.reduce((sum, p) => sum + p.amount, 0);
  const fee = settled.reduce((sum, p) => sum + p.platformFee, 0);

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t("admin.paymentsTitle")}</h1>
        <p className={styles.subtitle}>{t("admin.paymentsSubtitle")}</p>
      </div>

      <AdminTabs current="payments" locale={locale} />

      <div className={table.scroll}>
        <table className={table.table}>
          <thead>
            <tr>
              <th>{t("admin.colDate")}</th>
              <th>{t("admin.colMember")}</th>
              <th>{t("admin.colGym")}</th>
              <th>{t("admin.colMethod")}</th>
              <th>{t("admin.colStatus")}</th>
              <th className={table.num}>{t("admin.colAmount")}</th>
              <th className={table.num}>{t("admin.colFee")}</th>
              <th className={table.num}>{t("admin.colGymShare")}</th>
              <th className={table.num}>{t("admin.colRate")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{formatDate(p.paidAt, locale)}</td>
                <td className={table.name}>{p.memberName}</td>
                <td>{p.gymName[locale]}</td>
                <td>
                  {t(p.method === "card" ? "admin.methodCard" : "admin.methodKnet")}
                </td>
                <td>
                  <Badge tone={p.status === "paid" ? "ok" : "neutral"}>
                    {t(p.status === "paid" ? "admin.paid" : "admin.refunded")}
                  </Badge>
                </td>
                <td className={table.num}>
                  <Price amount={fils(p.amount)} locale={locale} size="sm" />
                </td>
                <td className={table.num}>
                  <Price amount={fils(p.platformFee)} locale={locale} size="sm" />
                </td>
                <td className={table.num}>
                  <Price amount={fils(p.gymAmount)} locale={locale} size="sm" />
                </td>
                {/* Basis points back to a percentage: 1500 → 15%. */}
                {/* The commission RATE is stored per payment rather than
                    looked up from a global setting. Deliberate: if the rate
                    changes next year, historical rows must still show the
                    rate that was actually charged. Same reasoning as storing
                    `pricePaid` on a membership. */}
                <td className={table.num}>
                  {formatNumber(p.commissionBps / 100, locale)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row count and settled count are different numbers whenever anything
          was refunded, so both are named rather than leaving "Total: 12"
          sitting under 13 visible rows. */}
      <p className={table.count}>
        {t("admin.total")}: {formatNumber(rows.length, locale)} ·{" "}
        {formatNumber(settled.length, locale)} {t("admin.paid").toLowerCase()} ·{" "}
        {t("admin.statGross")} <Price amount={fils(gross)} locale={locale} size="sm" /> ·{" "}
        {t("admin.statPlatform")} <Price amount={fils(fee)} locale={locale} size="sm" />
      </p>
    </main>
  );
}
