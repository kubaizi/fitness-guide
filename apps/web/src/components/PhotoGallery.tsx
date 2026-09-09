"use client";

import { useActionState, useRef, useState } from "react";
import type { Locale } from "@fg/i18n";
import { createTranslator, formatDate } from "@fg/i18n";
import {
  addProgressPhoto,
  removeProgressPhoto,
  type PrivateState,
} from "@/app/actions/private";
import type { ProgressPhotoRow } from "@/lib/db";
import styles from "./ProfileForm.module.css";

/**
 * The member's own photos of themselves. Private.
 *
 * ## Why this is separate from the profile picture
 *
 * They are two different things that happen to both be images. The avatar is
 * the one picture other people are meant to see; these are nobody's business
 * but the member's. Keeping them in different tables and different components
 * means no single careless query can put one where the other belongs.
 *
 * Emad's earlier decision ruled these out — "not body or progress photos,
 * which would need the same protection as medical data". He has since asked
 * for them, and answered his own objection: private, visible only to the
 * member. So they are built under the medical rules.
 *
 * The line under the heading says so on screen, which is not decoration. Anyone
 * deciding whether to photograph themselves for a gym app deserves the answer
 * without having to go looking for it.
 */

/** How many the server will accept. Mirrored from actions/private.ts. */
// Duplicated on purpose, and the server is the one that counts. This copy only
// decides whether to show the form — a member who has reached the limit should
// see why, not submit and be refused.
const MAX_PHOTOS = 12;

/**
 * Shrinks a photo to fit inside a box, keeping its shape.
 *
 * Different from the avatar's `shrinkToSquare`: a progress photo must not be
 * cropped. Someone photographing themselves has framed it the way they meant
 * to, and a square crop would cut off exactly what they were trying to record.
 *
 * So this scales the longest edge down to `maxEdge` and leaves the proportions
 * alone. 720px lands around 100 KB at this quality — small enough for the
 * column it goes into, large enough to see a change over three months.
 */
async function shrinkToFit(file: File, maxEdge = 720): Promise<string> {
  const bitmap = await createImageBitmap(file);

  // `Math.min(1, ...)` so a small photo is never scaled UP. Enlarging adds
  // bytes and invents detail that was never there.
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", 0.78);
}

export function PhotoGallery({
  locale,
  photos,
}: {
  locale: Locale;
  photos: readonly ProgressPhotoRow[];
}) {
  const t = createTranslator(locale);
  const [state, action, pending] = useActionState<PrivateState, FormData>(
    addProgressPhoto,
    {},
  );

  const [image, setImage] = useState<string | null>(null);
  const [pickError, setPickError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().slice(0, 10);
  const full = photos.length >= MAX_PHOTOS;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickError(false);
    try {
      setImage(await shrinkToFit(file));
    } catch {
      setPickError(true);
    }
    // So choosing the same file twice still fires `change`.
    e.target.value = "";
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{t("gallery.title")}</h2>
      <p className={styles.privacy}>{t("gallery.hint")}</p>

      {full ? (
        <p className={styles.hint}>{t("gallery.full")}</p>
      ) : (
        <form action={action} className={styles.weightForm}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="image" value={image ?? ""} />

          <div className={styles.field}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPick}
              className={styles.file}
              aria-label={t("gallery.pick")}
            />
            <button
              type="button"
              className={styles.secondary}
              onClick={() => fileRef.current?.click()}
            >
              {t("gallery.pick")}
            </button>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="takenOn">
              {t("gallery.date")}
            </label>
            <input
              id="takenOn"
              name="takenOn"
              type="date"
              defaultValue={today}
              max={today}
              className={styles.input}
              dir="ltr"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="note">
              {t("gallery.note")}
            </label>
            <input
              id="note"
              name="note"
              type="text"
              maxLength={120}
              placeholder={t("gallery.notePlaceholder")}
              className={styles.input}
            />
          </div>

          {/* Disabled until a picture is chosen: the date and the note are
              optional, but there is nothing to add without an image. */}
          <button
            type="submit"
            className={styles.secondary}
            disabled={pending || image === null}
          >
            {pending ? t("common.loading") : t("gallery.add")}
          </button>
        </form>
      )}

      {/* The chosen picture, before it is saved. Shown at a readable size so
          the member can see they picked the right one. */}
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className={styles.pendingPhoto} />
      )}

      {(pickError || state.error) && (
        <p className={styles.error} role="alert">
          {pickError ? t("gallery.photoInvalid") : state.error}
        </p>
      )}

      {photos.length === 0 ? (
        <p className={styles.hint}>{t("gallery.none")}</p>
      ) : (
        <ul className={styles.grid}>
          {photos.map((p) => (
            <li key={p.id} className={styles.gridItem}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.note ?? ""} className={styles.gridPhoto} />
              <div className={styles.gridMeta}>
                <span className={styles.gridDate}>{formatDate(p.takenOn, locale)}</span>
                {p.note && <span className={styles.gridNote}>{p.note}</span>}
                <form action={removeProgressPhoto}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className={styles.linkBtn}>
                    {t("gallery.remove")}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
