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
// A named constant, used twice: once to fetch and once to decide whether to
// show "recent only" at the bottom. Two separate literal 100s could drift
// apart, and the footnote would then lie about what is on screen.
const LIMIT = 100;

/** G-15 — the door's check-in log. */
// Same dashboard skeleton as the other three — see ../page.tsx.
// Table markup is explained in ../members/page.tsx.
export default async function ManageCheckInsPage({
  params,
}: PageProps<"/[locale]/manage/[slug]/check-ins">) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  await requireGymAccess(slug, locale);

  const gym = await findGymBySlug(slug);
  if (!gym) notFound();

  const t = createTranslator(locale);
  const rows = await checkInsForGym(gym.id, LIMIT);
  const summary = await checkInSummaryForGym(gym.id);

  // Four summary tiles described as DATA, then rendered by one small loop
  // below — rather than four near-identical blocks of markup that could drift
  // apart. The same data-driven approach as SectionGrid.tsx and AdminTabs.tsx.
  //
  // `as const` keeps the labels as exact literals so they satisfy
  // `TranslationKey` when passed to `t()`.
  //
  // Note these tiles read zero on the stale demo dataset. That is correct
  // behaviour on old data, not a bug — see checkInSummaryForGym in lib/db.ts.
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

          {/* Says "recent only" exactly when the list was truncated — i.e.
              when it came back full. Without this, a gym reading "100" would
              have no way to tell whether that is the total or a cap, which is
              the sort of small dishonesty that erodes trust in a dashboard.

              The empty string in the false branch renders nothing. */}
          <p className={table.count}>
            {formatNumber(rows.length, locale)}
            {rows.length === LIMIT ? ` · ${t("manage.recentOnly")}` : ""}
          </p>
        </>
      )}
    </main>
  );
}
