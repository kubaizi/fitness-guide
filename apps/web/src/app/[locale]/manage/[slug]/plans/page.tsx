import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator, isLocale } from "@fg/i18n";
import { requireGymAccess } from "@/lib/dal";
import { allPlansForGym, findGymBySlug, isPlanActive } from "@/lib/db";
import { PlanEditor } from "@/components/PlanEditor";
import { ManageTabs } from "@/components/ManageTabs";
import styles from "@/components/ManageForm.module.css";

/** G-10 — membership plan editor. */
export default async function ManagePlansPage({
  params,
}: PageProps<"/[locale]/manage/[slug]/plans">) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  await requireGymAccess(slug, locale);

  const gym = findGymBySlug(slug);
  if (!gym) notFound();

  const t = createTranslator(locale);
  // Inactive plans included on purpose — the editor must be able to bring
  // one back, which a members-only view would hide.
  const plans = allPlansForGym(gym.id);

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>{t("manage.plansTitle")}</h1>
          <p className={styles.subtitle}>{t("manage.plansSubtitle")}</p>
        </div>
        <Link href={`/${locale}/gyms/${gym.slug}`} className={styles.tab}>
          {t("manage.viewPublic")}
        </Link>
      </div>

      <ManageTabs current="plans" slug={gym.slug} locale={locale} />

      <p className={styles.notice}>{t("manage.demoWarning")}</p>

      {plans.map((plan) => (
        <PlanEditor
          key={plan.id}
          plan={plan}
          slug={gym.slug}
          active={isPlanActive(plan.id)}
          locale={locale}
        />
      ))}
    </main>
  );
}
