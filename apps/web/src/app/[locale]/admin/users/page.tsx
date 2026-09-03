import { notFound } from "next/navigation";
import { fils } from "@fg/core";
import type { TranslationKey } from "@fg/i18n";
import { createTranslator, formatNumber, isLocale } from "@fg/i18n";
import { requireAdmin } from "@/lib/dal";
import { adminUsers } from "@/lib/db";
import { Badge } from "@/components/Badge";
import { Price } from "@/components/Price";
import styles from "../admin.module.css";
import { AdminTabs } from "@/components/AdminTabs";
import table from "@/components/DataTable.module.css";

const ROLE_KEY: Record<string, TranslationKey> = {
  member: "admin.roleMember",
  admin: "admin.roleAdmin",
  gym_owner: "admin.roleGymOwner",
  gym_staff: "admin.roleGymStaff",
};

/** Admin: every user account. */
// ── Worth noticing what is NOT on this page ──
// No password column, and no way to get one. The rows come from `adminUsers`,
// which maps every record through `publicUser` — see lib/db.ts, where the
// hash-bearing `StoredUser` type is deliberately not exported.
//
// So even an admin console cannot display a password hash, because no type
// carrying one can reach a page. That is the value of enforcing a rule in the
// type system rather than by remembering to be careful.
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

      <AdminTabs current="users" locale={locale} />

      <div className={table.scroll}>
        <table className={table.table}>
          <thead>
            <tr>
              <th>{t("admin.colUser")}</th>
              <th>{t("admin.colPhone")}</th>
              <th>{t("admin.colRole")}</th>
              <th className={table.num}>{t("admin.colMemberships")}</th>
              <th className={table.num}>{t("admin.colActive")}</th>
              <th className={table.num}>{t("admin.colTotalPaid")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, membershipCount, activeCount, totalPaid }) => (
              <tr key={user.id}>
                <td>
                  <div className={table.name}>{user.name}</div>
                  <div className={`${table.sub} ${table.mono} ${table.ltr}`}>
                    {user.username}
                  </div>
                </td>
                {/* The admin account genuinely has no phone — it signs in by
                    username only. So this says "no phone" rather than leaving
                    the cell blank, which would read as missing data. */}
                <td>
                  {user.phone ? (
                    <span className={`${table.mono} ${table.ltr}`}>{user.phone}</span>
                  ) : (
                    <span className={table.sub}>{t("admin.noPhone")}</span>
                  )}
                </td>
                <td>
                  <Badge tone={user.role === "admin" ? "warn" : "neutral"}>
                    {t(ROLE_KEY[user.role] ?? "admin.roleMember")}
                  </Badge>
                </td>
                <td className={table.num}>{formatNumber(membershipCount, locale)}</td>
                <td className={table.num}>{formatNumber(activeCount, locale)}</td>
                <td className={table.num}>
                  <Price amount={fils(totalPaid)} locale={locale} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={table.count}>
        {t("admin.total")}: {formatNumber(rows.length, locale)}
      </p>
    </main>
  );
}
