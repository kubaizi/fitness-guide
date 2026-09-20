import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator, formatDate, isLocale } from "@fg/i18n";
import { requireAdmin } from "@/lib/dal";
import { openReports } from "@/lib/db";
import { dismiss, removeReported } from "@/app/actions/moderation";
import { AdminTabs } from "@/components/AdminTabs";
import styles from "../admin.module.css";
import local from "./page.module.css";

/**
 * The moderation queue: what members flagged, oldest first.
 *
 * Each row is one report and two buttons — remove the thing, or leave it and
 * close the report. There is no third state, no "warn the member", no strike
 * count. Emad said build the report button; this is the smallest honest thing
 * that makes a report mean something.
 *
 * ── What this page cannot show ──
 * A private photo. `openReports` excludes them in its query, and no report can
 * be raised on one to begin with, because the report button only exists where
 * a photo is visible. The admin reaches only what a member chose to publish.
 */
export default async function AdminReportsPage({
  params,
}: PageProps<"/[locale]/admin/reports">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  await requireAdmin(locale);

  const t = createTranslator(locale);
  const rows = await openReports();

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t("moderation.title")}</h1>
        <p className={styles.subtitle}>{t("moderation.subtitle")}</p>
      </div>

      <AdminTabs current="reports" locale={locale} />

      {rows.length === 0 ? (
        <p className={local.empty}>{t("moderation.empty")}</p>
      ) : (
        <ul className={local.list}>
          {rows.map((r) => (
            <li key={r.id} className={local.report}>
              <div className={local.what}>
                {r.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photo.image} alt="" className={local.thumb} />
                )}
                <div className={local.text}>
                  <span className={local.kind}>
                    {r.photo ? t("moderation.photo") : t("moderation.comment")}
                  </span>
                  {r.comment && <p className={local.body}>“{r.comment.body}”</p>}
                  {r.photo?.note && <p className={local.body}>{r.photo.note}</p>}
                  <p className={local.meta}>
                    {t("moderation.postedBy")}{" "}
                    <strong>{(r.photo ?? r.comment)?.author.name}</strong>
                    {" · "}
                    {t("moderation.reportedBy")} <strong>{r.reporter.name}</strong>
                    {" · "}
                    {formatDate(r.createdAt, locale)}
                  </p>
                  <p className={local.reason}>{r.reason ?? t("moderation.noReason")}</p>
                  <Link
                    href={`/${locale}/feed/${r.photo?.id ?? r.comment?.photoId}`}
                    className={local.open}
                  >
                    {t("feed.open")} ↗
                  </Link>
                </div>
              </div>

              <div className={local.buttons}>
                <form action={removeReported}>
                  <input type="hidden" name="locale" value={locale} />
                  {r.photo && <input type="hidden" name="photoId" value={r.photo.id} />}
                  {r.comment && (
                    <input type="hidden" name="commentId" value={r.comment.id} />
                  )}
                  <button type="submit" className={local.remove}>
                    {t("moderation.remove")}
                  </button>
                </form>
                <form action={dismiss}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className={local.dismiss}>
                    {t("moderation.dismiss")}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
