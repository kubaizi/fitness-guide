import { notFound } from "next/navigation";
import { createTranslator, isLocale } from "@fg/i18n";
import { GYMS } from "@/lib/gyms";
import { ExploreBrowser } from "@/components/ExploreBrowser";
import styles from "./page.module.css";

// C-12 + C-14: search results with filters. The page itself stays a server
// component — only the filter controls need to be interactive, so only they
// ship JavaScript to the browser.
export default async function ExplorePage({ params }: PageProps<"/[locale]/explore">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{t("explore.title")}</h1>
      <ExploreBrowser gyms={GYMS} locale={locale} />
    </main>
  );
}
