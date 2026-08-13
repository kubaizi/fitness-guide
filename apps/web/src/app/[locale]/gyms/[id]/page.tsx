import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, createTranslator } from "@fg/i18n";
import { findGymBySlug, plansForGym } from "@/lib/gyms";
import { Badge } from "@/components/Badge";
import { Rating } from "@/components/Rating";
import { Price } from "@/components/Price";
import { GymPhoto } from "@/components/GymPhoto";
import { Amenities } from "@/components/Amenities";
import { PlanCard } from "@/components/PlanCard";
import styles from "./page.module.css";

const ACCESS_KEY = {
  men: "access.men",
  women: "access.women",
  mixed: "access.mixed",
  separate_sections: "access.separateSections",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: raw, id } = await params;
  const gym = await findGymBySlug(id);
  if (!isLocale(raw) || !gym) return {};
  return { title: `${gym.name[raw]} — ${gym.area[raw]}` };
}

// This screen is C-17 in the spec: the gym profile. It carries the most
// product logic of any screen in release one — verification state, pricing,
// review eligibility — so it is the one that sets the pattern the rest follow.
export default async function GymProfilePage({
  params,
}: PageProps<"/[locale]/gyms/[id]">) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const gym = await findGymBySlug(id);
  if (!gym) notFound();

  const plans = await plansForGym(gym.id);
  const t = createTranslator(locale);
  const verified = gym.verification.state === "verified";

  // A gym can only be reviewed by someone with a purchase or check-in on
  // record (C-23 in the spec). There is no membership data on this page, so
  // the honest state here is "locked", never a fabricated "write a review".
  const canReview = false;

  return (
    <>
      <nav className={styles.crumb}>
        <Link href={`/${locale}`}>{t("nav.home")}</Link>
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
            priority
          />
        </div>
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

        {gym.startingPrice !== null && (
          <div className={styles.headAction}>
            <span className={styles.fromLabel}>{t("gym.startingFrom")}</span>
            <Price amount={gym.startingPrice} locale={locale} size="lg" />
            <a href="#plans" className={styles.cta}>
              {t("gym.viewPlans")}
            </a>
          </div>
        )}
      </header>

      <div className={styles.body}>
        <div className={styles.content}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("gym.about")}</h2>
            <p className={styles.about}>{gym.description[locale]}</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("gym.amenities")}</h2>
            <Amenities items={gym.amenities} locale={locale} />
          </section>

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

            <div className={styles.reviewLocked}>
              <span>{canReview ? "" : t("gym.reviewLocked")}</span>
              <button type="button" className={styles.writeBtn} disabled={!canReview}>
                {t("gym.writeReview")}
              </button>
            </div>
          </section>
        </div>

        <aside className={styles.aside}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{t("gym.hours")}</h3>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>
                {gym.openNow ? t("gym.openNow") : t("gym.closed")}
              </span>
              <span className="ltr">{gym.hours[locale]}</span>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{t("gym.location")}</h3>
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
