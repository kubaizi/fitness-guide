import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator, isLocale } from "@fg/i18n";
import { requireGymAccess } from "@/lib/dal";
import { activePlanIdsForGym, allPlansForGym, findGymBySlug } from "@/lib/db";
import { PlanEditor } from "@/components/PlanEditor";
import { ManageTabs } from "@/components/ManageTabs";
import styles from "@/components/ManageForm.module.css";

/** G-10 — membership plan editor. */
// Same skeleton as ../page.tsx — see that file for the walkthrough.
export default async function ManagePlansPage({
  params,
}: PageProps<"/[locale]/manage/[slug]/plans">) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  await requireGymAccess(slug, locale);

  const gym = await findGymBySlug(slug);
  if (!gym) notFound();

  const t = createTranslator(locale);
  // Inactive plans included on purpose — the editor must be able to bring
  // one back, which a members-only view would hide.
  //
  // `allPlansForGym` rather than `plansForGym`. Two functions instead of one
  // boolean flag, so the call site states its intent by name and cannot pass
  // the wrong argument — see the note in lib/db.ts.
  const plans = await allPlansForGym(gym.id);
  // Which of those plans are on sale, fetched once as a Set. See
  // `activePlanIdsForGym` in lib/db.ts for why this is not asked per plan.
  const activeIds = await activePlanIdsForGym(gym.id);

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

      {/* ── One <form> PER PLAN, not one form for the page ──
          Each PlanEditor is an independent form with its own submit button
          and its own error state, so a bad price on one plan cannot block
          saving a correction to another. That design decision is why this
          maps over the plans rather than wrapping them all in a single form.

          Each also gets its own useActionState, since state belongs to a
          component instance — three PlanEditors mean three separate states. */}
      {plans.map((plan) => (
        <PlanEditor
          key={plan.id}
          plan={plan}
          slug={gym.slug}
          // Passed separately because the domain `MembershipPlan` type has no
          // `active` field — it is a storage concern, not a domain one, so it
          // is read from the raw record instead.
          active={activeIds.has(plan.id)}
          locale={locale}
        />
      ))}
    </main>
  );
}
