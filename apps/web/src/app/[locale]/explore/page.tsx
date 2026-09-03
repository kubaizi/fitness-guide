import { notFound } from "next/navigation";
import { createTranslator, isLocale } from "@fg/i18n";
import { getGyms } from "@/lib/db";
import { ExploreBrowser } from "@/components/ExploreBrowser";
import styles from "./page.module.css";

// C-12 + C-14: search results with filters. The page itself stays a server
// component — only the filter controls need to be interactive, so only they
// ship JavaScript to the browser.
//
// ═══════════════════════════════════════════════════════════════════════════
// THIS FILE IS THE CLEAREST EXAMPLE OF THE SERVER/CLIENT SPLIT DONE WELL.
//
//   SERVER (this file)          reads the gyms from the data layer
//        ↓ passes them as a prop
//   CLIENT (ExploreBrowser)     filters and sorts them as the user types
//
// What that buys:
//   • The first HTML response already contains every gym, so the page is
//     visible and indexable before any JavaScript runs.
//   • lib/db.ts and the JSON files never reach the browser.
//   • Only ExploreBrowser's code is downloaded — not this page's, not the
//     data layer's.
//
// The instinct from older React would be to make the whole page a client
// component and fetch from a useEffect. That would mean a spinner on every
// visit, an API route to write, and a larger bundle. Push "use client" as far
// down the tree as it will go; here, that is one component.
// ═══════════════════════════════════════════════════════════════════════════
export default async function ExplorePage({
  params,
  searchParams,
}: PageProps<"/[locale]/explore">) {
  const { locale: raw } = await params;
  // The home page's search box is a plain GET form pointing here, so the query
  // arrives in the URL. Reading it makes the result a real, shareable link
  // rather than state that only exists after someone types.
  const { q } = await searchParams;
  const initialQuery = typeof q === "string" ? q : "";
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);
  // Loaded once, on the server, and handed over whole. The whole dataset is
  // small enough to filter in the browser — see the note at the top of
  // ExploreBrowser.tsx about when that stops being true.
  const gyms = getGyms();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{t("explore.title")}</h1>
      {/* Props crossing the server → client boundary must be SERIALISABLE:
          plain data that can survive being turned into JSON. Objects, arrays,
          strings and numbers are fine. Functions, class instances and Dates
          are not — passing a function here would be a build error. That is
          why `gyms` holds only plain values and why dates in this codebase
          are stored as strings. */}
      <ExploreBrowser gyms={gyms} locale={locale} initialQuery={initialQuery} />
    </main>
  );
}
