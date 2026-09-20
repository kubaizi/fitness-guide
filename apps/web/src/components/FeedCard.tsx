"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Locale } from "@fg/i18n";
import { createTranslator, formatDate } from "@fg/i18n";
import {
  commentOnPhoto,
  likePhoto,
  removeComment,
  reportPhotoOrComment,
  type FeedState,
} from "@/app/actions/feed";
import type { CommentRow, FeedPhoto } from "@/lib/db";
import { AvatarPlaceholder } from "./AvatarPlaceholder";
import styles from "./FeedCard.module.css";

/**
 * One photo on the feed: the picture, who posted it, and the buttons.
 *
 * ## Who can press what
 *
 * `canAct` is true only for a signed-in MEMBER — Emad's answer was that a gym
 * owner is not part of the community. A visitor or an owner sees the counts
 * and a line saying to sign in as a member; the buttons are simply not there.
 * The Server Actions check the same thing again, because a button that is not
 * rendered can still be posted to.
 *
 * ## The report button
 *
 * On every photo and every comment, for any member. It opens a small box for a
 * reason and sends. The reporter gets "thank you" and nothing more — see the
 * note in actions/feed.ts for why they are told nothing about what happened.
 */
export function FeedCard({
  locale,
  photo,
  viewerId,
  canAct,
  comments,
  detail = false,
}: {
  locale: Locale;
  photo: FeedPhoto;
  /** The signed-in user's id, so their own comments get a delete button. */
  viewerId: string | null;
  canAct: boolean;
  /** Present on the photo's own page; absent on the feed. */
  comments?: readonly CommentRow[];
  detail?: boolean;
}) {
  const t = createTranslator(locale);

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        {photo.author.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.author.photo} alt="" className={styles.avatar} />
        ) : (
          <AvatarPlaceholder className={styles.avatarEmpty} />
        )}
        <div className={styles.who}>
          <span className={styles.name}>{photo.author.name}</span>
          <span className={styles.meta}>
            {formatDate(photo.takenOn, locale)}
            {photo.visibility === "members" && (
              <span className={styles.membersBadge}>{t("feed.membersOnly")}</span>
            )}
          </span>
        </div>
      </header>

      {/* On the feed the picture links to its own page; on that page it is
          just the picture. One component, two contexts. */}
      {detail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.image} alt={photo.note ?? ""} className={styles.image} />
      ) : (
        <Link href={`/${locale}/feed/${photo.id}`} className={styles.imageLink}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.image} alt={photo.note ?? ""} className={styles.image} />
        </Link>
      )}

      {photo.note && <p className={styles.note}>{photo.note}</p>}

      <div className={styles.actions}>
        {canAct ? (
          <form action={likePhoto}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="photoId" value={photo.id} />
            <button
              type="submit"
              className={photo.likedByViewer ? styles.likeOn : styles.like}
              aria-pressed={photo.likedByViewer}
              aria-label={photo.likedByViewer ? t("feed.unlike") : t("feed.like")}
            >
              ♥ {photo.likeCount}
            </button>
          </form>
        ) : (
          <span className={styles.count}>♥ {photo.likeCount}</span>
        )}

        {detail ? (
          <span className={styles.count}>
            {photo.commentCount} {t("feed.comments")}
          </span>
        ) : (
          <Link href={`/${locale}/feed/${photo.id}`} className={styles.count}>
            {photo.commentCount} {t("feed.comments")}
          </Link>
        )}

        {canAct && <ReportButton locale={locale} photoId={photo.id} />}
      </div>

      {!canAct && <p className={styles.signIn}>{t("feed.signInToLike")}</p>}

      {comments && (
        <Comments
          locale={locale}
          photoId={photo.id}
          photoOwnerId={photo.author.id}
          comments={comments}
          viewerId={viewerId}
          canAct={canAct}
        />
      )}
    </article>
  );
}

function Comments({
  locale,
  photoId,
  photoOwnerId,
  comments,
  viewerId,
  canAct,
}: {
  locale: Locale;
  photoId: string;
  photoOwnerId: string;
  comments: readonly CommentRow[];
  viewerId: string | null;
  canAct: boolean;
}) {
  const t = createTranslator(locale);
  const [state, action, pending] = useActionState<FeedState, FormData>(
    commentOnPhoto,
    {},
  );

  return (
    <section className={styles.comments}>
      {comments.length > 0 && (
        <ul className={styles.commentList}>
          {comments.map((c) => (
            <li key={c.id} className={styles.comment}>
              {c.author.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.author.photo} alt="" className={styles.commentAvatar} />
              ) : (
                <AvatarPlaceholder className={styles.commentAvatarEmpty} />
              )}
              <div className={styles.commentBody}>
                <span className={styles.commentName}>{c.author.name}</span>
                <span className={styles.commentText}>{c.body}</span>
                <span className={styles.commentActions}>
                  {/* Delete: your own comment, or any comment on your own
                      photo. The action checks the same two conditions in
                      its query. */}
                  {(viewerId === c.author.id || viewerId === photoOwnerId) && (
                    <form action={removeComment}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="photoId" value={photoId} />
                      <button type="submit" className={styles.tiny}>
                        {t("feed.deleteComment")}
                      </button>
                    </form>
                  )}
                  {canAct && viewerId !== c.author.id && (
                    <ReportButton locale={locale} commentId={c.id} />
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAct ? (
        <form action={action} className={styles.commentForm}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="photoId" value={photoId} />
          <input
            name="body"
            type="text"
            maxLength={300}
            required
            placeholder={t("feed.commentPlaceholder")}
            className={styles.commentInput}
            aria-label={t("feed.comment")}
          />
          <button type="submit" className={styles.send} disabled={pending}>
            {pending ? "…" : t("feed.send")}
          </button>
          {state.error && (
            <p className={styles.error} role="alert">
              {state.error}
            </p>
          )}
        </form>
      ) : (
        <p className={styles.signIn}>{t("feed.signInToComment")}</p>
      )}
    </section>
  );
}

/**
 * A small "Report" that opens into a box for a reason and a Send.
 *
 * Two clicks on purpose. A single-click report button gets pressed by accident
 * and by children, and every accidental report is a real person's photo in an
 * admin's queue.
 */
function ReportButton({
  locale,
  photoId,
  commentId,
}: {
  locale: Locale;
  photoId?: string;
  commentId?: string;
}) {
  const t = createTranslator(locale);
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<FeedState, FormData>(reportPhotoOrComment, {});
  const [sent, setSent] = useState(false);

  // Once the action comes back without an error, the report went through.
  // Same compare-during-render recipe as the gallery.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (!state.error) {
      setSent(true);
      setOpen(false);
    }
  }

  if (sent) return <span className={styles.tiny}>{t("feed.reported")}</span>;

  if (!open) {
    return (
      <button type="button" className={styles.tiny} onClick={() => setOpen(true)}>
        {t("feed.report")}
      </button>
    );
  }

  return (
    <form action={action} className={styles.reportForm}>
      <input type="hidden" name="locale" value={locale} />
      {photoId && <input type="hidden" name="photoId" value={photoId} />}
      {commentId && <input type="hidden" name="commentId" value={commentId} />}
      <input
        name="reason"
        type="text"
        maxLength={200}
        placeholder={t("feed.reportReason")}
        className={styles.commentInput}
        aria-label={t("feed.reportReason")}
      />
      <button type="submit" className={styles.send}>
        {t("feed.reportSend")}
      </button>
      <button type="button" className={styles.tiny} onClick={() => setOpen(false)}>
        {t("common.cancel")}
      </button>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
