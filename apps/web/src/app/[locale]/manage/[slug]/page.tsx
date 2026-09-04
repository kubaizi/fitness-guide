import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator, isLocale } from "@fg/i18n";
import { requireGymAccess } from "@/lib/dal";
import { findGymBySlug } from "@/lib/db";
import { GymProfileForm } from "@/components/GymProfileForm";
import { ManageTabs } from "@/components/ManageTabs";
import styles from "@/components/ManageForm.module.css";

/** G-07 — gym profile editor. */
// ── The first of the four dashboard pages ──
// All four share the same skeleton:
//   1. validate the locale
//   2. `await requireGymAccess(slug, locale)` — the permission gate
//   3. load the gym, 404 if missing
//   4. render a heading, the tab strip, then the page's own content
//
// Read this one and the other three (plans, members, check-ins) will be
// familiar — only step 4 differs between them.
export default async function ManageGymPage({
  params,
}: PageProps<"/[locale]/manage/[slug]">) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  // Admin may edit any gym; a gym owner only their own. Anyone else 404s.
  //
  // Note it is awaited for its EFFECT and its return value discarded — the
  // point is that it throws (redirect or 404) for anyone not entitled. See
  // lib/dal.ts.
  //
  // And note where it sits: BEFORE the gym is loaded. Check permission before
  // touching data, not after.
  await requireGymAccess(slug, locale);

  const gym = await findGymBySlug(slug);
  if (!gym) notFound();

  const t = createTranslator(locale);

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>{gym.name[locale]}</h1>
          <p className={styles.subtitle}>{t("manage.profileSubtitle")}</p>
        </div>
        {/* A way back to the public page, so an owner can check how an edit
            actually looks to a member. */}
        <Link href={`/${locale}/gyms/${gym.slug}`} className={styles.tab}>
          {t("manage.viewPublic")}
        </Link>
      </div>

      {/* `current="profile"` tells the strip which tab to render as inert
          text rather than a link — see ManageTabs.tsx. */}
      <ManageTabs current="profile" slug={gym.slug} locale={locale} />

      {/* Says plainly that edits may not survive on a serverless host. See
          `persist` in lib/db.ts for what actually happens. */}
      <p className={styles.notice}>{t("manage.demoWarning")}</p>

      {/* The only client component on the page. Everything above is static
          server-rendered markup. */}
      <GymProfileForm gym={gym} locale={locale} />
    </main>
  );
}
