"use client";

import { useParams } from "next/navigation";
import { DEFAULT_LOCALE, createTranslator, isLocale } from "@fg/i18n";
import styles from "./loading.module.css";

/**
 * What every page under /[locale] shows while it loads.
 *
 * ## The problem this solves
 *
 * Tap "my account" and, for a second or two, nothing happened. The header
 * stayed, the old page stayed, and then the new one appeared all at once. On
 * a slow connection that gap is long enough to tap again, or to decide the
 * site is broken. Emad decided the latter.
 *
 * ## How `loading.tsx` works
 *
 * Next treats this file as the fallback for every page in this folder and
 * below. The moment a link is tapped, the page area swaps to this — before a
 * single byte of the real page has arrived — and the real page replaces it
 * when it is ready. The header and everything else in the layout stay put
 * and stay usable. No JavaScript of ours is involved in the swap; it is React
 * Suspense, and Next wires it up because of the file's name.
 *
 * ## Why it is a skeleton and not a spinner
 *
 * A spinner says "wait". Grey shapes in roughly the places the content will
 * land say "wait, and here is where things will be" — and when the real page
 * arrives, less moves. Nothing here is a real width: the shapes are the same
 * on every page, and they are honest about that by being plainly placeholders.
 *
 * ## Why it is a client component
 *
 * `loading.tsx` gets no props, so it cannot be handed the locale the way a
 * page is. `useParams()` reads it from the URL instead, which only a client
 * component can do — and it is needed only for the one line a screen reader
 * hears. The rest is CSS.
 */
export default function Loading() {
  const params = useParams<{ locale?: string }>();
  // Into a local first, so the type guard can narrow it. TypeScript narrows
  // the exact expression it was handed, and `params.locale ?? ""` is not the
  // same expression as `params.locale`.
  const raw = params.locale ?? "";
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = createTranslator(locale);

  return (
    // `role="status"` and `aria-busy` tell a screen reader this region is in
    // flux, and the visually hidden text says what is happening. The shapes
    // themselves are `aria-hidden`: there is nothing to read in a grey bar.
    <main className={styles.main} role="status" aria-busy="true">
      <span className={styles.srOnly}>{t("common.loading")}</span>

      <div aria-hidden="true">
        <div className={styles.title} />
        <div className={styles.subtitle} />

        <div className={styles.card}>
          <div className={styles.line} />
          <div className={styles.lineShort} />
          <div className={styles.line} />
        </div>

        <div className={styles.card}>
          <div className={styles.lineShort} />
          <div className={styles.block} />
        </div>

        <div className={styles.card}>
          <div className={styles.line} />
          <div className={styles.lineShort} />
        </div>
      </div>
    </main>
  );
}
