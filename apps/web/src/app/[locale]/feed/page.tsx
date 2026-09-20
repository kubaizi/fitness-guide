import { notFound } from "next/navigation";
import { createTranslator, isLocale } from "@fg/i18n";
import { getCurrentUser } from "@/lib/dal";
import { feedPhotos } from "@/lib/db";
import { FeedCard } from "@/components/FeedCard";
import styles from "./page.module.css";

/**
 * The feed — photos members chose to share.
 *
 * "Like Instagram, but belonging to the platform" — Emad's words. Anyone can
 * open this page. What they see depends on who they are:
 *
 *   a visitor          public photos
 *   a signed-in member public and members-only photos, and can like/comment
 *   a gym owner        public photos, like a visitor — not part of the community
 *
 * The page does not decide any of that. It hands the viewer to `feedPhotos`,
 * which puts the visibility filter in its own query, and to FeedCard, which
 * hides the buttons. Nothing here could show a private photo even by mistake,
 * because nothing here can ask for one.
 */
export default async function FeedPage({ params }: PageProps<"/[locale]/feed">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);

  const user = await getCurrentUser();
  const viewer = user ? { id: user.id, role: user.role } : null;
  const canAct = user?.role === "member";

  const photos = await feedPhotos(viewer);

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t("feed.title")}</h1>
        <p className={styles.subtitle}>{t("feed.subtitle")}</p>
      </div>

      {photos.length === 0 ? (
        <p className={styles.empty}>{t("feed.empty")}</p>
      ) : (
        <div className={styles.column}>
          {photos.map((p) => (
            <FeedCard
              key={p.id}
              locale={locale}
              photo={p}
              viewerId={user?.id ?? null}
              canAct={canAct}
            />
          ))}
        </div>
      )}
    </main>
  );
}
