import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createTranslator,
  formatDate,
  formatNumber,
  formatTime,
  isLocale,
} from "@fg/i18n";
import { requireGymAccess } from "@/lib/dal";
import { checkInSummaryForGym, checkInsForGym, findGymBySlug } from "@/lib/db";
import { ManageTabs } from "@/components/ManageTabs";
import styles from "@/components/ManageForm.module.css";
import table from "@/components/DataTable.module.css";

/** How many scans the log shows before it stops. */
const LIMIT = 100;

/** G-15 — the door's check-in log. */
export default async function ManageCheckInsPage({
  params,
}: PageProps<"/[locale]/manage/[slug]/check-ins">) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  await requireGymAccess(slug, locale);

  const gym = findGymBySlug(slug);
  if (!gym) notFound();

  const t = createTranslator(locale);
  const rows = checkInsForGym(gym.id, LIMIT);
  const summary = checkInSummaryForGym(gym.id);

  const stats = [
    { label: "manage.statToday", value: summary.today },
    { label: "manage.statLast7", value: summary.last7 },
    { label: "manage.statLast30", value: summary.last30 },
    { label: "manage.statUnique", value: summary.uniqueMembers30 },
  ] as const;

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>{t("manage.checkInsTitle")}</h1>
          <p className={styles.subtitle}>{t("manage.checkInsSubtitle")}</p>
        </div>
        <Link href={`/${locale}/gyms/${gym.slug}`} className={styles.tab}>
          {t("manage.viewPublic")}
        </Link>
      </div>

      <ManageTabs current="checkIns" slug={gym.slug} locale={locale} />

      <div className={table.stats}>
        {stats.map((s) => (
          <div key={s.label} className={table.stat}>
            <div className={table.statValue}>{formatNumber(s.value, locale)}</div>
            <div className={table.statLabel}>{t(s.label)}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className={table.empty}>
          <p className={table.emptyTitle}>{t("manage.noCheckIns")}</p>
          <p>{t("manage.noCheckInsHint")}</p>
        </div>
      ) : (
        <>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th>{t("manage.colDate")}</th>
                  <th>{t("manage.colTime")}</th>
                  <th>{t("manage.colMember")}</th>
                  <th>{t("manage.colPlan")}</th>
                  <th>{t("manage.colToken")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>{formatDate(c.scannedAt, locale)}</td>
                    {/* Times are LTR even in Arabic — "6:14 AM" must not flip. */}
                    <td>
                      <span className={table.ltr}>{formatTime(c.scannedAt, locale)}</span>
                    </td>
                    <td className={table.name}>{c.memberName}</td>
                    <td>{c.planName[locale]}</td>
                    <td>
                      <span className={`${table.mono} ${table.ltr} ${table.sub}`}>
                        {c.checkInToken}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className={table.count}>
            {formatNumber(rows.length, locale)}
            {rows.length === LIMIT ? ` · ${t("manage.recentOnly")}` : ""}
          </p>
        </>
      )}
    </main>
  );
}
