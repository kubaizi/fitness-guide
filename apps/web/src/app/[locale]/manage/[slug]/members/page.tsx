import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator, formatDate, formatNumber, isLocale } from "@fg/i18n";
import { requireGymAccess } from "@/lib/dal";
import { findGymBySlug, membersForGym } from "@/lib/db";
import { describeStatus, endDateOf, startDateOf } from "@/lib/membership";
import { ManageTabs } from "@/components/ManageTabs";
import { Badge } from "@/components/Badge";
import { Price } from "@/components/Price";
// TWO stylesheets, imported under different names. CSS-module imports are
// just objects, so they can be named anything — `styles` for the page frame,
// `table` for the shared data-table styling reused across the admin screens.
import styles from "@/components/ManageForm.module.css";
import table from "@/components/DataTable.module.css";

/** G-13 — the gym's member roster. */
// The first TABLE in this walkthrough. The six admin screens all follow the
// same pattern, so the notes here are the ones worth reading.
//
// ── Real table markup, and why it matters ──
//   <table>   the table
//   <thead>   the header row group
//   <th>      a header cell — announced as the column name
//   <tbody>   the data rows
//   <td>      a data cell
//
// A screen reader uses this structure to say "Plan: Monthly" when moving
// across a row, rather than reading a wall of disconnected values. Building
// the same grid out of divs looks identical and loses all of it.
//
// Tables were misused for page layout in the 1990s, which gave them a bad
// reputation. For actual tabular data — which this is — they remain correct.
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
  // Already sorted by the data layer — active first, then soonest to expire.
  // That ordering is a product decision, so it lives in lib/db.ts with the
  // query rather than being re-sorted here in the view.
  const rows = membersForGym(gym.id);
  // `.filter(...).length` — the idiomatic "count where" in JavaScript.
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
          {/* A wrapper that scrolls horizontally. Eight columns cannot fit on
              a 375px phone, and letting the TABLE scroll inside this box —
              rather than the whole page — keeps the rest of the layout still. */}
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
                {/* Destructuring five fields straight out of each row in the
                    parameter list, so the body reads `member.name` rather
                    than `row.member.name`. */}
                {rows.map(
                  ({ membership, member, planName, checkInCount, lastCheckIn }) => {
                    // The same three helpers the member's own list uses, from
                    // lib/membership.ts — which is exactly why they live there
                    // rather than in either page.
                    const { key, tone } = describeStatus(membership.status);
                    const startsOn = startDateOf(membership.status);
                    const endsOn = endDateOf(membership.status);

                    return (
                      <tr key={membership.id}>
                        <td>
                          <div className={table.name}>{member.name}</div>
                          {/* Three classes at once: smaller text, a monospace
                              face so digits align down the column, and `ltr`
                              so the phone number is not reordered by the bidi
                              algorithm on the Arabic page. */}
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
                        {/* An em dash for "this state has no start date",
                            rather than a blank cell. A reader can tell the
                            difference between "nothing here" and "something
                            failed to load"; an empty cell is ambiguous. */}
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
