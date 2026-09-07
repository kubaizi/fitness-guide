import Link from "next/link";
import { notFound } from "next/navigation";
import type { TranslationKey } from "@fg/i18n";
import { createTranslator, isLocale } from "@fg/i18n";
import { requireUser } from "@/lib/dal";
import { profileFor, weightsFor } from "@/lib/db";
import { ProfileForm } from "@/components/ProfileForm";
import { WeightLog } from "@/components/WeightLog";
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
 * Emad's list for this page: photo, name, date of birth, occupation, weight
 * with a date, email, and social accounts. All of it is here and editable, and
 * everything except the name is optional — his rule.
 *
 * Three things are read-only, because they are not the member's to change from
 * here: the username identifies the account, the phone number is the identity
 * this market signs in with, and the role is set by the platform.
 *
 * The medical file is still shown as unbuilt. Its four rules are settled
 * (docs/product-decisions.md) but nothing of it is written yet, and weight —
 * which IS here — is treated under those same rules: see WeightLog.tsx.
 */
export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);

  // Redirects to the member door when signed out. The data layer checks again.
  const user = await requireUser(locale);

  // Both are scoped to the signed-in id. Neither takes an id from the URL, so
  // there is no version of this page that shows somebody else's profile.
  //
  // Fetched together rather than one after the other — they do not depend on
  // each other, so waiting for them in turn would cost two round trips for no
  // reason.
  const [profile, weights] = await Promise.all([
    profileFor(user.id),
    weightsFor(user.id),
  ]);

  // The session says this user exists and the row says otherwise — an account
  // deleted while its cookie was still valid. Rare, and a 404 is the honest
  // answer rather than a crash.
  if (!profile) notFound();

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>{t("account.title")}</h1>
          <p className={styles.subtitle}>{t("account.subtitle")}</p>
        </div>
      </div>

      {/* What the member cannot change here, kept short and stated plainly
          rather than shown as disabled boxes — a greyed-out field invites
          people to try to edit it and then wonder why they cannot. */}
      <section className={styles.card}>
        <dl className={styles.rows}>
          {(
            [
              ["account.username", profile.username],
              ["account.phone", profile.phone ?? t("account.noPhone")],
              ["account.role", t(ROLE_KEY[profile.role] ?? "admin.roleMember")],
            ] as const
          ).map(([key, value]) => (
            <div key={key} className={styles.row}>
              <dt className={styles.label}>{t(key)}</dt>
              <dd className={styles.value}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ProfileForm locale={locale} profile={profile} />

      {/* Members only. An admin holds no memberships and does not weigh in on
          this platform; showing them an empty weight log would be noise. */}
      {user.role !== "admin" && <WeightLog locale={locale} entries={weights} />}

      {user.role !== "admin" && (
        <Link href={`/${locale}/memberships`} className={styles.cta}>
          {t("account.myMemberships")}
        </Link>
      )}

      {/* Still unbuilt. Shown so the shape of the account is visible, and
          because the four rules that govern it are agreed but nothing has been
          written against them yet. */}
      <section className={`${styles.card} ${styles.cardSoon}`}>
        <div className={styles.soonHead}>
          <h2 className={styles.cardTitle}>{t("account.medical")}</h2>
          <span className={styles.soon}>{t("account.soon")}</span>
        </div>
        <p className={styles.note}>{t("account.medicalSoon")}</p>
      </section>
    </main>
  );
}
