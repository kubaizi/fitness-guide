import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator, formatDate, formatNumber, isLocale } from "@fg/i18n";
import { requireGymAccess } from "@/lib/dal";
import { findGymBySlug, membersForGym } from "@/lib/db";
import { describeStatus, endDateOf, startDateOf } from "@/lib/membership";
import { ManageTabs } from "@/components/ManageTabs";
import { Badge } from "@/components/Badge";
import { Price } from "@/components/Price";
import styles from "@/components/ManageForm.module.css";
import table from "@/components/DataTable.module.css";

/** G-13 — the gym's member roster. */
export default async function ManageMembersPage({
  params,
}: PageProps<"/[locale]/manage/[slug]/members">) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  await requireGymAccess(slug, locale);

  const gym = findGymBySlug(slug);
  if (!gym) notFound();

  const t = createTranslator(locale);
  const rows = membersForGym(gym.id);
  const activeCount = rows.filter((r) => r.membership.status.state === "active").length;

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>{t("manage.membersTitle")}</h1>
          <p className={styles.subtitle}>{t("manage.membersSubtitle")}</p>
        </div>
        <Link href={`/${locale}/gyms/${gym.slug}`} className={styles.tab}>
          {t("manage.viewPublic")}
        </Link>
      </div>

      <ManageTabs current="members" slug={gym.slug} locale={locale} />

      {rows.length === 0 ? (
        <div className={table.empty}>
          <p className={table.emptyTitle}>{t("manage.noMembers")}</p>
          <p>{t("manage.noMembersHint")}</p>
        </div>
      ) : (
        <>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th>{t("manage.colMember")}</th>
                  <th>{t("manage.colPlan")}</th>
                  <th>{t("manage.colState")}</th>
                  <th>{t("manage.colStarted")}</th>
                  <th>{t("manage.colExpires")}</th>
                  <th className={table.num}>{t("manage.colPaid")}</th>
                  <th className={table.num}>{t("manage.colVisits")}</th>
                  <th>{t("manage.colLastVisit")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(
                  ({ membership, member, planName, checkInCount, lastCheckIn }) => {
                    const { key, tone } = describeStatus(membership.status);
                    const startsOn = startDateOf(membership.status);
                    const endsOn = endDateOf(membership.status);

                    return (
                      <tr key={membership.id}>
                        <td>
                          <div className={table.name}>{member.name}</div>
                          {member.phone && (
                            <div className={`${table.sub} ${table.mono} ${table.ltr}`}>
                              {member.phone}
                            </div>
                          )}
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
                          <Price
                            amount={membership.pricePaid}
                            locale={locale}
                            size="sm"
                          />
                        </td>
                        <td className={table.num}>
                          {formatNumber(checkInCount, locale)}
                        </td>
                        <td>
                          {lastCheckIn ? (
                            formatDate(lastCheckIn, locale)
                          ) : (
                            <span className={table.sub}>{t("manage.neverVisited")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>

          <p className={table.count}>
            {formatNumber(rows.length, locale)} · {formatNumber(activeCount, locale)}{" "}
            {t("manage.activeMembers")}
          </p>
        </>
      )}
    </main>
  );
}
