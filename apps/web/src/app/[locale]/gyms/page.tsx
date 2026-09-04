import { notFound } from "next/navigation";
import { admits, type AccessFilter } from "@fg/core";
import { createTranslator, isLocale } from "@fg/i18n";
import { getGyms } from "@/lib/db";
import { ExploreBrowser } from "@/components/ExploreBrowser";
import { GymAccessTiles } from "@/components/GymAccessTiles";
import { AdSlots } from "@/components/AdSlots";
import styles from "./page.module.css";

/**
 * G-01 — the gyms section landing page.
 *
 * Emad's design opens on men / women / mixed rather than on a list, and he
 * confirmed that is the primary way in. The tiles pre-select the filter on the
 * browser below rather than navigating to a separate screen, so there is one
 * page and one set of results instead of two that have to agree.
 */
export default async function GymsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/gyms">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);

  const { access, offers } = await searchParams;
  const initialAccess: AccessFilter | "all" =
    access === "men" || access === "women" || access === "mixed" ? access : "all";

  const gyms = await getGyms();

  // Counted from the same list the browser filters, so a tile can never
  // promise gyms that are not there.
  const counts = {
    men: gyms.filter((g) => admits(g.access, "men")).length,
    women: gyms.filter((g) => admits(g.access, "women")).length,
    mixed: gyms.filter((g) => admits(g.access, "mixed")).length,
    offers: gyms.filter((g) => g.hasOffer).length,
  };

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t("gymsPage.title")}</h1>
        <p className={styles.subtitle}>{t("gymsPage.subtitle")}</p>
      </div>

      <GymAccessTiles locale={locale} counts={counts} />

      {/* The mockup repeats the advertising strip on this page too. */}
      <div className={styles.adStrip}>
        <AdSlots locale={locale} count={3} />
      </div>

      <ExploreBrowser
        gyms={gyms}
        locale={locale}
        initialAccess={initialAccess}
        initialOffers={offers === "1"}
      />
    </main>
  );
}
