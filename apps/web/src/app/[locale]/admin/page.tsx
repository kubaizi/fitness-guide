import { notFound } from "next/navigation";
import { fils } from "@fg/core";
import { createTranslator, formatNumber, isLocale } from "@fg/i18n";
import { requireAdmin } from "@/lib/dal";
import { adminOverview } from "@/lib/db";
import { AdminTabs } from "@/components/AdminTabs";
import { Price } from "@/components/Price";
import styles from "./admin.module.css";
import table from "@/components/DataTable.module.css";

/** A-01 — what the whole platform is doing, at a glance. */
// ── The admin console: six pages, one skeleton ──
//   1. validate the locale
//   2. `await requireAdmin(locale)` — the gate
//   3. load the data
//   4. heading, AdminTabs, then this page's content
//
// The gym dashboard under /manage has the same shape with a different gate
// (`requireGymAccess`). Deliberate: the two consoles should not feel like
// different products.
//
// Note what `requireAdmin` does for a signed-in NON-admin: a 404, not a
// "forbidden". Telling someone a page exists but is off-limits is itself
// information — see lib/dal.ts.
export default async function AdminOverviewPage({
  params,
}: PageProps<"/[locale]/admin">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  await requireAdmin(locale);

  const t = createTranslator(locale);
  // Short name because it is referenced a dozen times just below. Acceptable
  // for a value used densely within a few lines; a poor choice for anything
  // wider-lived.
  const o = adminOverview();

  // Tiles as data again, rendered by one loop. `sub` carries a secondary
  // figure — "12 · 9 verified" — so each tile gives the total and the part
  // that matters, without a second row of tiles.
  const counts = [
    {
      label: "admin.statGyms",
      value: o.gyms,
      sub: `${o.verifiedGyms} ${t("admin.statVerified")}`,
    },
    {
      label: "admin.statUsers",
      value: o.users,
      sub: `${o.members} ${t("admin.statMembers")}`,
    },
    {
      label: "admin.statMemberships",
      value: o.memberships,
      sub: `${o.activeMemberships} ${t("admin.statActive")}`,
    },
    { label: "admin.statCheckIns", value: o.checkIns, sub: "" },
  ] as const;

  // Money gets its own row: mixing counts and dinars in one grid makes the
  // numbers look comparable when they are not.
  const money = [
    { label: "admin.statGross", value: o.grossRevenue },
    { label: "admin.statPlatform", value: o.platformRevenue },
    { label: "admin.statGymShare", value: o.gymRevenue },
  ] as const;

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t("admin.overviewTitle")}</h1>
        <p className={styles.subtitle}>{t("admin.overviewSubtitle")}</p>
      </div>

      <AdminTabs current="overview" locale={locale} />

      <div className={table.stats}>
        {counts.map((s) => (
          <div key={s.label} className={table.stat}>
            <div className={table.statValue}>{formatNumber(s.value, locale)}</div>
            <div className={table.statLabel}>
              {t(s.label)}
              {s.sub ? ` · ${s.sub}` : ""}
            </div>
          </div>
        ))}
      </div>

      <div className={table.stats}>
        {money.map((s) => (
          <div key={s.label} className={table.stat}>
            <div className={table.statValue}>
              {/* `fils(s.value)` re-brands a plain number as `Fils` so it can
                  be passed to Price. The admin queries return raw numbers
                  because they come straight from JSON; `fils()` validates as
                  it converts, so a corrupt figure throws here rather than
                  rendering as a wrong total. See packages/core/src/money.ts. */}
              <Price amount={fils(s.value)} locale={locale} size="md" />
            </div>
            <div className={table.statLabel}>{t(s.label)}</div>
          </div>
        ))}
      </div>

      <p className={table.count}>{t("manage.demoWarning")}</p>
    </main>
  );
}
