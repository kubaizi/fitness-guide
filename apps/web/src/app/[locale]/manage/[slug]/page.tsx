import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator, isLocale } from "@fg/i18n";
import { requireGymAccess } from "@/lib/dal";
import { findGymBySlug } from "@/lib/db";
import { GymProfileForm } from "@/components/GymProfileForm";
import { ManageTabs } from "@/components/ManageTabs";
import styles from "@/components/ManageForm.module.css";

/** G-07 — gym profile editor. */
export default async function ManageGymPage({
  params,
}: PageProps<"/[locale]/manage/[slug]">) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  // Admin may edit any gym; a gym owner only their own. Anyone else 404s.
  await requireGymAccess(slug, locale);

  const gym = findGymBySlug(slug);
  if (!gym) notFound();

  const t = createTranslator(locale);

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>{gym.name[locale]}</h1>
          <p className={styles.subtitle}>{t("manage.profileSubtitle")}</p>
        </div>
        <Link href={`/${locale}/gyms/${gym.slug}`} className={styles.tab}>
          {t("manage.viewPublic")}
        </Link>
      </div>

      <ManageTabs current="profile" slug={gym.slug} locale={locale} />

      <p className={styles.notice}>{t("manage.demoWarning")}</p>

      <GymProfileForm gym={gym} locale={locale} />
    </main>
  );
}
