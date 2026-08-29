import Link from "next/link";
import { isLocale, createTranslator } from "@fg/i18n";
import { notFound } from "next/navigation";
import { getGyms } from "@/lib/db";
import { GymCard } from "@/components/GymCard";
import { SectionGrid } from "@/components/SectionGrid";
import styles from "./page.module.css";

// `PageProps<'/[locale]'>` is a Next.js 16 global helper, generated from the
// directory structure — no manual params type to keep in sync by hand.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);
  const gyms = getGyms();

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>{t("home.title")}</h1>
          <p className={styles.subtitle}>{t("home.subtitle")}</p>
        </div>
      </section>

      <main className={styles.main}>
        {/*
          The eight verticals come first, the way a marketplace app opens on
          its category grid. It is the only place the whole product is visible
          at once — everything below is the one vertical that is actually
          built.
        */}
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>{t("sections.title")}</h2>
            <p className={styles.sectionNote}>{t("sections.subtitle")}</p>
          </div>
        </div>

        <SectionGrid locale={locale} />

        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("home.nearbyGyms")}</h2>
          <Link href={`/${locale}/explore`} className={styles.viewAll}>
            {t("common.viewAll")}
          </Link>
        </div>

        <div className={styles.grid}>
          {gyms.map((gym) => (
            <GymCard key={gym.id} gym={gym} locale={locale} />
          ))}
        </div>
      </main>
    </>
  );
}
