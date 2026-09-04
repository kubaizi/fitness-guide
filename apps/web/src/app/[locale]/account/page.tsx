import Link from "next/link";
import { notFound } from "next/navigation";
import type { TranslationKey } from "@fg/i18n";
import { createTranslator, isLocale } from "@fg/i18n";
import { requireUser } from "@/lib/dal";
import styles from "./page.module.css";

const ROLE_KEY: Record<string, TranslationKey> = {
  member: "admin.roleMember",
  admin: "admin.roleAdmin",
  gym_owner: "admin.roleGymOwner",
  gym_staff: "admin.roleGymStaff",
};

/**
 * C-33 — the member's own account.
 *
 * Emad described three parts: personal information, a medical section, and a
 * profile picture, with everything optional except the personal information.
 * Only the first is real here. The other two are shown as unbuilt rather than
 * omitted, so the shape is visible — and because the medical file needs a
 * written decision on who may read it and how long it is kept before a line of
 * it gets written. See docs/product-decisions.md.
 */
export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);

  // Redirects to the member door when signed out. The data layer checks again.
  const user = await requireUser(locale);
  const initial = [...user.name][0] ?? "?";

  const rows: readonly (readonly [TranslationKey, string])[] = [
    ["account.name", user.name],
    ["account.username", user.username],
    ["account.phone", user.phone ?? t("account.noPhone")],
    ["account.role", t(ROLE_KEY[user.role] ?? "admin.roleMember")],
  ];

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <span className={styles.avatar} aria-hidden="true">
          {initial}
        </span>
        <div>
          <h1 className={styles.title}>{t("account.title")}</h1>
          <p className={styles.subtitle}>{t("account.subtitle")}</p>
        </div>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{t("account.personal")}</h2>
        <dl className={styles.rows}>
          {rows.map(([key, value]) => (
            <div key={key} className={styles.row}>
              <dt className={styles.label}>{t(key)}</dt>
              <dd className={styles.value}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* A member's memberships are the thing they come here for, so this is a
          link rather than a buried menu item. Not shown to admins, who hold
          none — the account menu leaves it out for them too. */}
      {user.role !== "admin" && (
        <Link href={`/${locale}/memberships`} className={styles.cta}>
          {t("account.myMemberships")}
        </Link>
      )}

      {/* Not built. Shown so the shape of the account is visible, dimmed and
          labelled so nobody mistakes either for a working feature. */}
      {(
        [
          ["account.medical", "account.medicalSoon"],
          ["account.photo", "account.photoSoon"],
        ] as const
      ).map(([title, note]) => (
        <section key={title} className={`${styles.card} ${styles.cardSoon}`}>
          <div className={styles.soonHead}>
            <h2 className={styles.cardTitle}>{t(title)}</h2>
            <span className={styles.soon}>{t("account.soon")}</span>
          </div>
          <p className={styles.note}>{t(note)}</p>
        </section>
      ))}
    </main>
  );
}
