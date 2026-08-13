import { isLocale, createTranslator } from "@fg/i18n";
import { notFound } from "next/navigation";
import { getGyms } from "@/lib/gyms";
import { GymCard } from "@/components/GymCard";
import styles from "./page.module.css";

// `PageProps<'/[locale]'>` is a Next.js 16 global helper, generated from the
// directory structure — no manual params type to keep in sync by hand.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);
  const gyms = await getGyms();

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>{t("home.title")}</h1>
          <p className={styles.subtitle}>{t("home.subtitle")}</p>
        </div>
      </section>

      <main className={styles.main}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("home.nearbyGyms")}</h2>
          <span className={styles.viewAll}>{t("common.viewAll")}</span>
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
