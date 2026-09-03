import Link from "next/link";
import { isLocale, createTranslator } from "@fg/i18n";
import { notFound } from "next/navigation";
import { getGyms } from "@/lib/db";
import { GymCard } from "@/components/GymCard";
import { SectionGrid } from "@/components/SectionGrid";
import { HomeSearch } from "@/components/HomeSearch";
import { AdSlots } from "@/components/AdSlots";
// ── CSS Modules ──
// A file named `*.module.css` is scoped: the class `.hero` inside it is
// renamed to something unique like `page_hero__x7f2a` at build time. So
// `styles.hero` below is that generated name, and it can never collide with a
// `.hero` in another file. That is why the codebase has one .module.css
// sitting next to each component rather than a single global stylesheet.
import styles from "./page.module.css";

/**
 * The home page, at `/ar` or `/en`.
 *
 * Contrast with app/page.tsx (the bare `/`), which only redirects here.
 */

// `PageProps<'/[locale]'>` is a Next.js 16 global helper, generated from the
// directory structure — no manual params type to keep in sync by hand.
//
// It is GLOBAL: never imported, because Next generates the declaration during
// the build. The string `"/[locale]"` is the route this page serves, and Next
// uses it to work out that `params` resolves to `{ locale: string }`. Point a
// page at the wrong route string and it will not compile.
//
// An ASYNC Server Component — it can await directly in the body, with no
// useEffect and no loading state. This is the single biggest difference from
// the React you will find in most tutorials.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  // Renamed to `raw` on the way out of the promise because it is still just a
  // string at this point — it has not been checked yet.
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  // Reassigned to a new name so the narrowed `Locale` type carries forward
  // cleanly for the rest of the function.
  const locale = raw;
  const t = createTranslator(locale);
  // A direct, synchronous data read — no `await`, no API route, no fetch.
  // This runs on the server, so it can simply read the data. See src/lib/db.ts.
  const gyms = getGyms();

  return (
    // ── `<>...</>` is a FRAGMENT ──
    // A component must return ONE element. When you need several siblings
    // without wrapping them in a pointless <div>, a fragment groups them and
    // renders nothing itself.
    <>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          {/* `{t("home.title")}` — braces switch from markup back into
              JavaScript. Everything inside is an expression whose result is
              rendered. */}
          <h1 className={styles.title}>{t("home.title")}</h1>
          <p className={styles.subtitle}>{t("home.subtitle")}</p>
          <HomeSearch locale={locale} />
        </div>
      </section>

      <main className={styles.main}>
        {/* Empty until a real advertiser buys a slot — see AdSlots. */}
        <div className={styles.adStrip}>
          <AdSlots locale={locale} />
        </div>

        {/*
          The eight verticals come first, the way a marketplace app opens on
          its category grid. It is the only place the whole product is visible
          at once — everything below is the one vertical that is actually
          built.
        */}
        {/* Note the comment syntax used just above. Inside JSX you cannot
            write a bare `// comment` — it would be rendered on the page as
            literal text, because within markup everything is content until a
            brace opens. So a comment has to be a JavaScript block comment
            wrapped in braces, which is what every comment in this return
            statement is. */}
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>{t("sections.title")}</h2>
            <p className={styles.sectionNote}>{t("sections.subtitle")}</p>
          </div>
        </div>

        {/* Using a component. `locale={locale}` passes a PROP — an argument to
            the component function. See src/components/SectionGrid.tsx for the
            other side. */}
        <SectionGrid locale={locale} />

        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("home.nearbyGyms")}</h2>
          {/* `<Link>` rather than `<a>`. It navigates without a full page
              reload and prefetches the destination when the link scrolls into
              view, which is what makes moving around the app feel instant. */}
          <Link href={`/${locale}/gyms`} className={styles.viewAll}>
            {t("common.viewAll")}
          </Link>
        </div>

        <div className={styles.grid}>
          {/* ── Rendering a list ──
              `.map` turns each gym into a <GymCard>. React renders an array
              of elements by placing them one after another.

              `key` is REQUIRED and easy to overlook. React uses it to track
              which item is which between renders, so it can update the right
              one instead of rebuilding the whole list. It must be stable and
              unique among siblings — an id, never the array index, because an
              index changes when the list is reordered. */}
          {gyms.map((gym) => (
            <GymCard key={gym.id} gym={gym} locale={locale} />
          ))}
        </div>
      </main>
    </>
  );
}
