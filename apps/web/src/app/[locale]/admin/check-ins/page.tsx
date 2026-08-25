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

const LIMIT = 100;

/** A-03 — every scan at every gym. */
export default async function AdminCheckInsPage({
  params,
}: PageProps<"/[locale]/admin/check-ins">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  await requireAdmin(locale);

  const t = createTranslator(locale);
  const rows = adminCheckIns(LIMIT);

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
