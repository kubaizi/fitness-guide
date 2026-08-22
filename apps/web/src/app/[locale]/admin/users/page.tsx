import { notFound } from "next/navigation";
import { fils } from "@fg/core";
import type { TranslationKey } from "@fg/i18n";
import { createTranslator, formatNumber, isLocale } from "@fg/i18n";
import { requireAdmin } from "@/lib/dal";
import { adminUsers } from "@/lib/db";
import { Badge } from "@/components/Badge";
import { Price } from "@/components/Price";
import styles from "../admin.module.css";

const ROLE_KEY: Record<string, TranslationKey> = {
  member: "admin.roleMember",
  admin: "admin.roleAdmin",
  gym_owner: "admin.roleGymOwner",
  gym_staff: "admin.roleGymStaff",
};

/** Admin: every user account. */
export default async function AdminUsersPage({
  params,
}: PageProps<"/[locale]/admin/users">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  // Redirects if signed out, 404s if signed in but not an admin.
  await requireAdmin(locale);

  const t = createTranslator(locale);
  const rows = adminUsers();

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t("admin.usersTitle")}</h1>
        <p className={styles.subtitle}>{t("admin.usersSubtitle")}</p>
      </div>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("admin.colUser")}</th>
              <th>{t("admin.colPhone")}</th>
              <th>{t("admin.colRole")}</th>
              <th className={styles.num}>{t("admin.colMemberships")}</th>
              <th className={styles.num}>{t("admin.colActive")}</th>
              <th className={styles.num}>{t("admin.colTotalPaid")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, membershipCount, activeCount, totalPaid }) => (
              <tr key={user.id}>
                <td>
                  <div className={styles.name}>{user.name}</div>
                  <div className={`${styles.sub} ${styles.mono} ${styles.ltr}`}>
                    {user.username}
                  </div>
                </td>
                <td>
                  {user.phone ? (
                    <span className={`${styles.mono} ${styles.ltr}`}>{user.phone}</span>
                  ) : (
                    <span className={styles.sub}>{t("admin.noPhone")}</span>
                  )}
                </td>
                <td>
                  <Badge tone={user.role === "admin" ? "warn" : "neutral"}>
                    {t(ROLE_KEY[user.role] ?? "admin.roleMember")}
                  </Badge>
                </td>
                <td className={styles.num}>{formatNumber(membershipCount, locale)}</td>
                <td className={styles.num}>{formatNumber(activeCount, locale)}</td>
                <td className={styles.num}>
                  <Price amount={fils(totalPaid)} locale={locale} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={styles.count}>
        {t("admin.total")}: {formatNumber(rows.length, locale)}
      </p>
    </main>
  );
}
