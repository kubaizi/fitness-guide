import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator, isLocale } from "@fg/i18n";
import { getCurrentUser } from "@/lib/dal";
import { feedPhoto } from "@/lib/db";
import { FeedCard } from "@/components/FeedCard";
import styles from "../page.module.css";

/**
 * One photo, with its comments.
 *
 * `feedPhoto` returns null both when the id does not exist and when the viewer
 * is not allowed to see it. The page cannot tell the two apart, and neither
 * can anyone probing it: a private photo's URL gives a 404 identical to a
 * made-up one.
 */
export default async function FeedPhotoPage({
  params,
}: PageProps<"/[locale]/feed/[id]">) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = createTranslator(locale);

  const user = await getCurrentUser();
  const viewer = user ? { id: user.id, role: user.role } : null;
  const canAct = user?.role === "member";

  const photo = await feedPhoto(id, viewer);
  if (!photo) notFound();

  return (
    <main className={styles.main}>
      <p className={styles.back}>
        <Link href={`/${locale}/feed`}>← {t("feed.back")}</Link>
      </p>

      <div className={styles.column}>
        <FeedCard
          locale={locale}
          photo={photo}
          viewerId={user?.id ?? null}
          canAct={canAct}
          comments={photo.comments}
          detail
        />
      </div>
    </main>
  );
}
