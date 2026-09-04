import { notFound } from "next/navigation";
import {
  createTranslator,
  formatDate,
  formatNumber,
  formatTime,
  isLocale,
} from "@fg/i18n";
import { requireAdmin } from "@/lib/dal";
import { adminCheckIns } from "@/lib/db";
import { AdminTabs } from "@/components/AdminTabs";
import styles from "../admin.module.css";
import table from "@/components/DataTable.module.css";

// Capped for the same reason the gym's own log is: this table grows without
// bound, and a platform-wide scan log grows fastest of all.
const LIMIT = 100;

/** A-03 — every scan at every gym. */
// The cross-gym counterpart of ../../manage/[slug]/check-ins/page.tsx.
//
// One difference worth noticing: this page shows no check-in TOKEN column,
// while the gym's own log does. A gym needs the token to investigate a
// disputed entry at its own door; a platform-wide table has no such need, and
// entry tokens are the credential that opens a turnstile. Showing less is the
// right default for data that grants access.
export default async function AdminCheckInsPage({
  params,
}: PageProps<"/[locale]/admin/check-ins">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  await requireAdmin(locale);

  const t = createTranslator(locale);
  const rows = await adminCheckIns(LIMIT);

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t("admin.checkInsTitle")}</h1>
        <p className={styles.subtitle}>{t("admin.checkInsSubtitle")}</p>
      </div>

      <AdminTabs current="checkIns" locale={locale} />

      <div className={table.scroll}>
        <table className={table.table}>
          <thead>
            <tr>
              <th>{t("admin.colDate")}</th>
              <th>{t("admin.colTime")}</th>
              <th>{t("admin.colMember")}</th>
              <th>{t("admin.colGym")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{formatDate(c.scannedAt, locale)}</td>
                <td>
                  <span className={table.ltr}>{formatTime(c.scannedAt, locale)}</span>
                </td>
                <td className={table.name}>{c.memberName}</td>
                <td>{c.gymName[locale]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={table.count}>
        {formatNumber(rows.length, locale)}
        {rows.length === LIMIT ? ` · ${t("admin.recentOnly")}` : ""}
      </p>
    </main>
  );
}
