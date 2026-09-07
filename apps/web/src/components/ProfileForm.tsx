"use client";

import { useActionState, useRef, useState } from "react";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { saveProfile, type ProfileState } from "@/app/actions/profile";
import type { Profile } from "@/lib/db";
import styles from "./ProfileForm.module.css";

/**
 * The member editing their own details.
 *
 * Everything is optional except the name. That is Emad's rule for this page,
 * and it shapes the whole form: no field nags, nothing is marked required, and
 * an empty box means "not set" rather than an error waiting to happen.
 */

/** The four networks, and how to build a link from a stored handle. */
// Kept here rather than in the action, because this is presentation: the
// database holds "rodi_k" and this is the only thing that knows Instagram
// lives at instagram.com. Change a URL and nothing stored has to change.
const SOCIALS = [
  {
    key: "instagram",
    label: "Instagram",
    url: (h: string) => `https://instagram.com/${h}`,
  },
  { key: "x", label: "X", url: (h: string) => `https://x.com/${h}` },
  {
    key: "snapchat",
    label: "Snapchat",
    url: (h: string) => `https://snapchat.com/add/${h}`,
  },
  { key: "tiktok", label: "TikTok", url: (h: string) => `https://tiktok.com/@${h}` },
] as const;

/**
 * Shrinks a chosen picture to a 256px square before it is ever sent.
 *
 * ## Why this happens in the browser
 *
 * Someone's phone takes a 4 MB photo. Sending that and resizing on the server
 * means 4 MB over a mobile connection, every time, for a picture that ends up
 * 40 KB. Doing it here means the big file never leaves the phone.
 *
 * It also keeps the stored value small enough to live in a database column at
 * all — see the note on `photo` in schema.prisma.
 *
 * ## The cover crop
 *
 * `Math.max` of the two scale factors fills the square and lets the longer
 * side overflow, then the drawing is centred so the overflow is trimmed evenly
 * from both ends. `Math.min` would fit the whole image inside the square and
 * leave empty bars down two sides.
 *
 * The server checks the result anyway. Anything from the browser is a
 * suggestion, including a value this very function produced — a Server Action
 * can be posted to directly, without ever loading this page.
 */
async function shrinkToSquare(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);

  // Frees the decoded image straight away rather than waiting for the garbage
  // collector — these are large, and a member trying three photos in a row
  // would otherwise hold all three in memory.
  bitmap.close();

  // JPEG at 0.82. Visibly indistinguishable from the original at this size,
  // and a fraction of the bytes of PNG for a photograph.
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function ProfileForm({ locale, profile }: { locale: Locale; profile: Profile }) {
  const t = createTranslator(locale);
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    saveProfile,
    {},
  );

  // The picture currently shown, which is not the same as the picture saved:
  // it changes the moment one is chosen and only reaches the database on save.
  const [photo, setPhoto] = useState<string | null>(profile.photo);
  const [photoError, setPhotoError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(false);
    try {
      setPhoto(await shrinkToSquare(file));
    } catch {
      // A file the browser cannot decode — a renamed .txt, a corrupt image.
      // Reported in place rather than thrown, which would blank the page.
      setPhotoError(true);
    }
    // Clears the file input so choosing the SAME file again still fires
    // `change`. Without this, picking a photo, removing it, and picking the
    // identical file does nothing at all — the value has not changed.
    e.target.value = "";
  }

  const errorFor = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="locale" value={locale} />
      {/* The picture travels as an ordinary form field. Empty means "remove". */}
      <input type="hidden" name="photo" value={photo ?? ""} />

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{t("profile.photo")}</h2>

        <div className={styles.photoRow}>
          {photo ? (
            /* A plain <img>, not next/image. The source is a data URI already
               in the page — there is nothing for an image optimiser to fetch,
               resize or cache, and next/image would refuse the URL anyway. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className={styles.photo} />
          ) : (
            <span className={styles.photoEmpty} aria-hidden="true">
              {[...profile.name][0] ?? "?"}
            </span>
          )}

          <div className={styles.photoActions}>
            {/* The real file input is hidden and driven by the button. A file
                input cannot be styled to match anything, and every browser
                draws it differently. The button is a real <button> so the
                keyboard and screen readers treat it properly. */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPick}
              className={styles.file}
              aria-label={t("profile.photoPick")}
            />
            <button
              type="button"
              className={styles.secondary}
              onClick={() => fileRef.current?.click()}
            >
              {t("profile.photoPick")}
            </button>

            {photo && (
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => setPhoto(null)}
              >
                {t("profile.photoRemove")}
              </button>
            )}

            <p className={styles.hint}>{t("profile.photoHint")}</p>
            {(photoError || errorFor("photo")) && (
              <p className={styles.error} role="alert">
                {t("profile.photoInvalid")}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{t("account.personal")}</h2>

        <Field id="name" label={t("account.name")} error={errorFor("name")}>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={profile.name}
            className={styles.input}
          />
        </Field>

        <Field id="email" label={t("profile.email")} error={errorFor("email")}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={profile.email ?? ""}
            className={styles.input}
            dir="ltr"
          />
        </Field>

        <Field
          id="dateOfBirth"
          label={t("profile.dateOfBirth")}
          error={errorFor("dateOfBirth")}
        >
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={profile.dateOfBirth ?? ""}
            className={styles.input}
            dir="ltr"
          />
        </Field>

        <Field
          id="occupation"
          label={t("profile.occupation")}
          error={errorFor("occupation")}
        >
          <input
            id="occupation"
            name="occupation"
            type="text"
            defaultValue={profile.occupation ?? ""}
            placeholder={t("profile.occupationPlaceholder")}
            className={styles.input}
          />
        </Field>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{t("profile.social")}</h2>
        <p className={styles.hint}>{t("profile.socialHint")}</p>

        {SOCIALS.map(({ key, label, url }) => {
          const saved = profile[key];
          return (
            <Field key={key} id={key} label={label} error={errorFor(key)}>
              <input
                id={key}
                name={key}
                type="text"
                defaultValue={saved ?? ""}
                className={styles.input}
                dir="ltr"
                // Latin handles, so left-to-right even on the Arabic page.
                placeholder="@name"
              />
              {/* Only shown for a handle already saved. Offering a link to
                  something half-typed would be a broken link. */}
              {saved && (
                <a
                  href={url(saved)}
                  target="_blank"
                  // `noopener` stops the opened page reaching back through
                  // window.opener; `noreferrer` stops it learning where the
                  // visitor came from. Both belong on every external link that
                  // opens in a new tab.
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                >
                  {url(saved)}
                </a>
              )}
            </Field>
          );
        })}
      </section>

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? t("common.loading") : t("profile.save")}
        </button>

        {state.saved && <span className={styles.ok}>{t("profile.saved")}</span>}

        {/* An error with no field named — nothing today produces one, but a
            silent refusal would be the worst possible outcome if one appeared. */}
        {state.error && !state.field && (
          <span className={styles.error} role="alert">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}

/** A label, a control and its error message, spaced consistently. */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
