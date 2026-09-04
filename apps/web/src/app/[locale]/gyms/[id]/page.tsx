import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, createTranslator } from "@fg/i18n";
import { findGymBySlug, plansForGym } from "@/lib/db";
import { Badge } from "@/components/Badge";
import { Rating } from "@/components/Rating";
import { Price } from "@/components/Price";
import { GymPhoto } from "@/components/GymPhoto";
import { Amenities } from "@/components/Amenities";
import { PlanCard } from "@/components/PlanCard";
import styles from "./page.module.css";

/**
 * The gym profile page, at `/ar/gyms/iron-club`.
 *
 * ── TWO dynamic segments in this route ──
 * The file sits at app/[locale]/gyms/[id]/page.tsx, so BOTH `[locale]` and
 * `[id]` are captured, and `params` resolves to `{ locale, id }`.
 *
 * Despite the name, `[id]` actually receives the gym's SLUG — the folder was
 * named before the lookup switched from ids to slugs. Renaming the folder
 * would change nothing about the URL, which is why it has not been worth
 * doing; `findGymBySlug` below makes the real behaviour clear.
 */

const ACCESS_KEY = {
  men: "access.men",
  women: "access.women",
  mixed: "access.mixed",
  separate_sections: "access.separateSections",
} as const;

// Per-page metadata, overriding the app-wide title from layout.tsx. Runs on
// the server before the page renders, so a shared link previews with the
// gym's actual name rather than the generic site title.
//
// It looks up the gym a second time, which seems wasteful — but Next
// deduplicates the work, and `findGymBySlug` is an in-memory array scan.
export async function generateMetadata({
  params,
}: {
  // Typed by hand here rather than with the `PageProps` helper, because that
  // helper is for the page function's props specifically.
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: raw, id } = await params;
  const gym = await findGymBySlug(id);
  // Returning `{}` falls back to the layout's metadata. Metadata generation
  // must not throw — the page's own `notFound()` below handles the 404.
  if (!isLocale(raw) || !gym) return {};
  return { title: `${gym.name[raw]} — ${gym.area[raw]}` };
}

// This screen is C-17 in the spec: the gym profile. It carries the most
// product logic of any screen in release one — verification state, pricing,
// review eligibility — so it is the one that sets the pattern the rest follow.
export default async function GymProfilePage({
  params,
}: PageProps<"/[locale]/gyms/[id]">) {
  // Destructuring both segments at once, renaming `locale` to `raw` because
  // it has not been validated yet.
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const gym = await findGymBySlug(id);
  // A second 404, for a slug that does not exist. `id` came from the URL, so
  // it can be anything at all — every dynamic segment needs a check like this.
  if (!gym) notFound();

  const plans = await plansForGym(gym.id);
  const t = createTranslator(locale);
  const verified = gym.verification.state === "verified";

  // A gym can only be reviewed by someone with a purchase or check-in on
  // record (C-23 in the spec). There is no membership data on this page, so
  // the honest state here is "locked", never a fabricated "write a review".
  //
  // Hardcoded `false` as a deliberate placeholder. Named rather than inlined
  // so the rule is visible and there is one obvious line to change when
  // membership data reaches this page.
  const canReview = false;

  return (
    <>
      {/* Breadcrumbs. The last item is a <span>, not a <Link> — you are
          already here. Same reasoning as the active tab in ManageTabs.tsx. */}
      <nav className={styles.crumb}>
        <Link href={`/${locale}`}>{t("nav.home")}</Link>
        {/* `aria-hidden` on the separator: it is punctuation, and a screen
            reader announcing "slash" between every crumb is pure noise. */}
        <span aria-hidden="true">/</span>
        <span>{gym.name[locale]}</span>
      </nav>

      <div className={styles.gallery}>
        <div className={styles.galleryMain}>
          {/* The hero image is the largest thing above the fold, so it is the
              one worth preloading — everything else can wait. */}
          <GymPhoto
            src={gym.photos[0]}
            alt={gym.name[locale]}
            seed={gym.id}
            sizes="(max-width: 900px) 100vw, 540px"
            // `priority` — the only image on the site that gets it. See the
            // note in GymPhoto.tsx on why prioritising everything is the same
            // as prioritising nothing.
            priority
          />
        </div>
        {/* Photos 2 and 3. Any of these may be undefined for a gym with fewer
            photos, and GymPhoto renders a placeholder rather than breaking.

            `seed={gym.id + "-2"}` varies the placeholder colour, so three
            missing photos do not render as three identical tiles. */}
        <GymPhoto
          src={gym.photos[1]}
          alt={`${gym.name[locale]} — ${t("gym.photos")}`}
          seed={gym.id + "-2"}
          sizes="(max-width: 900px) 50vw, 270px"
          tall
        />
        <GymPhoto
          src={gym.photos[2]}
          alt={`${gym.name[locale]} — ${t("gym.photos")}`}
          seed={gym.id + "-3"}
          sizes="(max-width: 900px) 50vw, 270px"
          tall
        />
      </div>

      <header className={styles.head}>
        <div className={styles.headMain}>
          <div className={styles.badges}>
            <Badge tone={verified ? "ok" : "warn"}>
              {verified ? t("gym.verified") : t("gym.pendingReview")}
            </Badge>
            <Badge tone={gym.openNow ? "ok" : "neutral"}>
              {gym.openNow ? t("gym.openNow") : t("gym.closed")}
            </Badge>
          </div>

          {/* The page's one <h1>. Headings should form a single outline —
              one h1, then h2 for each section, h3 inside those. Screen-reader
              users navigate by that outline, so skipping levels for visual
              reasons genuinely costs them. */}
          <h1 className={styles.name}>{gym.name[locale]}</h1>

          <div className={styles.subline}>
            <Rating rating={gym.rating} count={gym.reviewCount} locale={locale} />
            <span className={styles.dot} aria-hidden="true">
              ·
            </span>
            <span>{gym.area[locale]}</span>
            <span className={styles.dot} aria-hidden="true">
              ·
            </span>
            <span>{t(ACCESS_KEY[gym.access])}</span>
          </div>
        </div>

        {/* No price block at all for a gym with no published plans — better
            than a "from —" placeholder that says nothing. */}
        {gym.startingPrice !== null && (
          <div className={styles.headAction}>
            <span className={styles.fromLabel}>{t("gym.startingFrom")}</span>
            <Price amount={gym.startingPrice} locale={locale} size="lg" />
            {/* A plain <a>, not <Link>: `#plans` is an ANCHOR to a section
                further down THIS page, not a navigation to another route.
                It pairs with `id="plans"` below. */}
            <a href="#plans" className={styles.cta}>
              {t("gym.viewPlans")}
            </a>
          </div>
        )}
      </header>

      <div className={styles.body}>
        <div className={styles.content}>
          {/* `<section>` with a heading in each — the semantic way to divide
              a page. A stack of divs would look identical and convey nothing. */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("gym.about")}</h2>
            <p className={styles.about}>{gym.description[locale]}</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("gym.amenities")}</h2>
            <Amenities items={gym.amenities} locale={locale} />
          </section>

          {/* The `id` that the "view plans" anchor above jumps to. */}
          <section className={styles.section} id="plans">
            <h2 className={styles.sectionTitle}>{t("gym.plansTitle")}</h2>
            <div className={styles.plansGrid}>
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} locale={locale} />
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("gym.reviewsTitle")}</h2>

            {gym.rating !== null && (
              <div className={styles.reviewSummary}>
                <Rating rating={gym.rating} count={gym.reviewCount} locale={locale} />
              </div>
            )}

            {/* The review control is rendered but DISABLED, with an
                explanation beside it. The alternative — hiding it entirely —
                would leave a visitor unsure whether reviews exist at all.
                Showing a locked control and saying why is the more honest of
                the two, and it is why `canReview` exists as a named value. */}
            <div className={styles.reviewLocked}>
              <span>{canReview ? "" : t("gym.reviewLocked")}</span>
              <button type="button" className={styles.writeBtn} disabled={!canReview}>
                {t("gym.writeReview")}
              </button>
            </div>
          </section>
        </div>

        {/* `<aside>` for content related to the page but not part of its main
            thread — here, the sidebar of practical details. */}
        <aside className={styles.aside}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{t("gym.hours")}</h3>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>
                {gym.openNow ? t("gym.openNow") : t("gym.closed")}
              </span>
              {/* The `ltr` global class again — opening hours are digits and
                  times, which the bidi algorithm would otherwise reorder in
                  an Arabic paragraph. Same reasoning as Price.tsx. */}
              <span className="ltr">{gym.hours[locale]}</span>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{t("gym.location")}</h3>
            {/* A stub standing in for a real map. The gym's coordinates are
                in the data (`gym.location`) ready for whenever a map library
                is wired up. */}
            <div className={styles.mapStub}>{gym.area[locale]}</div>
            <p className={styles.address}>{gym.address[locale]}</p>
            <button type="button" className={styles.directionsBtn}>
              {t("gym.directions")}
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
