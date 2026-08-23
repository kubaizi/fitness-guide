import Link from "next/link";
import { notFound } from "next/navigation";
import { fils } from "@fg/core";
import type { TranslationKey } from "@fg/i18n";
import { createTranslator, formatNumber, isLocale } from "@fg/i18n";
import { requireAdmin } from "@/lib/dal";
import { adminGyms } from "@/lib/db";
import { Badge } from "@/components/Badge";
import { Price } from "@/components/Price";
import { Rating } from "@/components/Rating";
import styles from "../admin.module.css";
import table from "@/components/DataTable.module.css";

const ACCESS_KEY: Record<string, TranslationKey> = {
  men: "access.men",
  women: "access.women",
  mixed: "access.mixed",
  separate_sections: "access.separateSections",
};

/** Admin: every gym, with the figures that matter for oversight. */
export default async function AdminGymsPage({
  params,
}: PageProps<"/[locale]/admin/gyms">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  await requireAdmin(locale);

  const t = createTranslator(locale);
  const rows = adminGyms();

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t("admin.gymsTitle")}</h1>
        <p className={styles.subtitle}>{t("admin.gymsSubtitle")}</p>
      </div>

      <div className={table.scroll}>
        <table className={table.table}>
          <thead>
            <tr>
              <th>{t("admin.colGym")}</th>
              <th>{t("admin.colArea")}</th>
              <th>{t("admin.colAccess")}</th>
              <th>{t("admin.colStatus")}</th>
              <th>{t("admin.colRating")}</th>
              <th className={table.num}>{t("admin.colPlans")}</th>
              <th className={table.num}>{t("admin.colMembers")}</th>
              <th className={table.num}>{t("admin.colRevenue")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ gym, planCount, memberCount, grossRevenue }) => {
              const verified = gym.verification.state === "verified";
              return (
                <tr key={gym.id}>
                  <td>
                    <Link href={`/${locale}/gyms/${gym.slug}`} className={table.name}>
                      {gym.name[locale]}
                    </Link>
                    <div className={`${table.sub} ${table.mono} ${table.ltr}`}>
                      {gym.slug}
                    </div>
                  </td>
                  <td>{gym.area[locale]}</td>
                  <td>{t(ACCESS_KEY[gym.access] ?? "access.mixed")}</td>
                  <td>
                    <Badge tone={verified ? "ok" : "warn"}>
                      {verified ? t("gym.verified") : t("gym.pendingReview")}
                    </Badge>
                  </td>
                  <td>
                    <Rating rating={gym.rating} count={gym.reviewCount} locale={locale} />
                  </td>
                  <td className={table.num}>{formatNumber(planCount, locale)}</td>
                  <td className={table.num}>{formatNumber(memberCount, locale)}</td>
                  <td className={table.num}>
                    <Price amount={fils(grossRevenue)} locale={locale} size="sm" />
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
