"use client";

import { useActionState, useRef, useState } from "react";
import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator, formatDate } from "@fg/i18n";
import {
  addPhotos,
  changePhotoVisibility,
  removePhoto,
  type PrivateState,
} from "@/app/actions/private";
import type { PhotoRow, Visibility } from "@/lib/db";
import styles from "./ProfileForm.module.css";

/**
 * The member's own photos, with a choice per photo of who may see it.
 *
 * ## Three visibilities, one gallery
 *
 * Emad's answer was "public, members only, or private", chosen by the member.
 * So this is one album with a badge on each picture, not three albums — a
 * photo moves between the three with one control, and the member sees all of
 * theirs in one place regardless.
 *
 * `private` is the default and is under the medical rules. `public` puts the
 * member's name and avatar on the open web, and the form says so in plain
 * words beside that choice: that is the one line on this page nobody should
 * be able to miss.
 *
 * ## The folder
 *
 * Closed by default — a `<details>` element, which the browser handles with
 * no JavaScript: it opens and closes, it is keyboard-reachable, and a screen
 * reader announces it correctly. Emad's words were "like the phone's photo
 * album": a thing you open, not a wall of pictures on the profile.
 *
 * ## Several at once
 *
 * The file input is `multiple`. Each chosen file is shrunk in the browser and
 * becomes one hidden `image` field, and the action reads them all with
 * `formData.getAll`. Pick five, press Add once.
 */

const MAX_PHOTOS = 12;

/** The three choices, with the sentence that explains each. */
const VISIBILITIES: readonly {
  value: Visibility;
  label: TranslationKey;
  hint: TranslationKey;
}[] = [
  { value: "private", label: "gallery.vPrivate", hint: "gallery.vPrivateHint" },
  { value: "members", label: "gallery.vMembers", hint: "gallery.vMembersHint" },
  { value: "public", label: "gallery.vPublic", hint: "gallery.vPublicHint" },
];

/** Shrinks a photo to fit inside a box, keeping its shape. */
async function shrinkToFit(file: File, maxEdge = 720): Promise<string> {
  const bitmap = await createImageBitmap(file);
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
  photos: readonly PhotoRow[];
}) {
  const t = createTranslator(locale);
  const [state, action, pending] = useActionState<PrivateState, FormData>(addPhotos, {});

  const [images, setImages] = useState<string[]>([]);
  const [pickError, setPickError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Clearing the chosen pictures once they are saved ──
  // Without this, the previous batch stays in `images` after a successful add,
  // and pressing Add again silently saves the same photos twice. This was a
  // real bug: it is what made the report upload look like it "worked once".
  //
  // The shape is React's own recipe for "reset some state when a value
  // changes": remember the last value seen, and when it differs, reset during
  // render. Not an effect — the React Compiler refuses setState in an effect,
  // and with reason: it would paint the stale pictures for one frame first.
  const [seenSave, setSeenSave] = useState(state);
  if (state !== seenSave) {
    setSeenSave(state);
    if (state.added) setImages([]);
  }

  const today = new Date().toISOString().slice(0, 10);
  const room = MAX_PHOTOS - photos.length;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    if (files.length === 0) return;
    setPickError(false);
    try {
      // `Promise.all` shrinks them all at once rather than one after another;
      // decoding five photos serially would be a visible wait.
      const shrunk = await Promise.all(files.slice(0, room).map((f) => shrinkToFit(f)));
      setImages(shrunk);
    } catch {
      setPickError(true);
    }
    e.target.value = "";
  }

  return (
    <details className={styles.folder}>
      <summary className={styles.folderSummary}>
        <span className={styles.cardTitle}>{t("gallery.title")}</span>
        <span className={styles.folderCount}>{photos.length}</span>
        <span className={styles.folderOpen}>{t("gallery.open")}</span>
      </summary>

      <div className={styles.folderBody}>
        <p className={styles.hint}>{t("gallery.hint")}</p>

        {room <= 0 ? (
          <p className={styles.hint}>{t("gallery.full")}</p>
        ) : (
          <form action={action} className={styles.stack}>
            <input type="hidden" name="locale" value={locale} />
            {/* One hidden field per picture, all named `image`. The action
                reads them with getAll, so five pictures are five values under
                one name rather than image1, image2, image3… */}
            {images.map((img, i) => (
              <input key={i} type="hidden" name="image" value={img} />
            ))}

            <div className={styles.row}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
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
              {images.length > 0 && (
                <span className={styles.hint}>
                  {images.length} {t("gallery.picked")}
                </span>
              )}
            </div>

            {images.length > 0 && (
              <div className={styles.pendingRow}>
                {images.map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={img} alt="" className={styles.pendingThumb} />
                ))}
              </div>
            )}

            {/* The choice that matters. Radio buttons rather than a dropdown,
                so all three sentences are readable at once and nobody has to
                open a menu to discover what "public" costs them. */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.label}>{t("gallery.visibility")}</legend>
              {VISIBILITIES.map((v) => (
                <label key={v.value} className={styles.radio}>
                  <input
                    type="radio"
                    name="visibility"
                    value={v.value}
                    defaultChecked={v.value === "private"}
                  />
                  <span>
                    <strong>{t(v.label)}</strong>
                    <span className={styles.radioHint}>{t(v.hint)}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div className={styles.weightForm}>
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
              <button
                type="submit"
                className={styles.submit}
                disabled={pending || images.length === 0}
              >
                {pending
                  ? t("common.loading")
                  : images.length > 1
                    ? t("gallery.add")
                    : t("gallery.addOne")}
              </button>
            </div>
          </form>
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
                  <span className={`${styles.badge} ${styles[`badge_${p.visibility}`]}`}>
                    {t(
                      VISIBILITIES.find((v) => v.value === p.visibility)?.label ??
                        "gallery.vPrivate",
                    )}
                  </span>
                  <span className={styles.gridDate}>{formatDate(p.takenOn, locale)}</span>
                  {p.note && <span className={styles.gridNote}>{p.note}</span>}
                  {p.visibility !== "private" && (
                    <span className={styles.gridNote}>
                      ♥ {p.likeCount} · {p.commentCount} {t("feed.comments")}
                    </span>
                  )}

                  {/* Change who sees it: a tiny form with a <select> that
                      submits itself on change. No Save button, because one
                      choice is the whole action. */}
                  <form action={changePhotoVisibility} className={styles.gridActions}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={p.id} />
                    <select
                      name="visibility"
                      defaultValue={p.visibility}
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                      className={styles.smallSelect}
                      aria-label={t("gallery.change")}
                    >
                      {VISIBILITIES.map((v) => (
                        <option key={v.value} value={v.value}>
                          {t(v.label)}
                        </option>
                      ))}
                    </select>
                  </form>

                  {/* A real button with padding rather than an underlined
                      word — Emad could not hit the old one on a phone. */}
                  <form action={removePhoto}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className={styles.dangerSmall}>
                      {t("gallery.remove")}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
