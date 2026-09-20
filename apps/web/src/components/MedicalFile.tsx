"use client";

import { useActionState, useRef, useState } from "react";
import type { Locale, TranslationKey } from "@fg/i18n";
import { createTranslator, formatDate } from "@fg/i18n";
import {
  addMedicalReport,
  eraseMedicalFile,
  removeMedicalReport,
  saveMedicalFile,
  type PrivateState,
} from "@/app/actions/private";
import type { MedicalAnswers, MedicalReportRow } from "@/lib/db";
import styles from "./ProfileForm.module.css";

/**
 * The member's health answers, and their reports.
 *
 * ## The four rules this is built under
 *
 * They are in docs/product-decisions.md, confirmed by Emad. In short: the
 * member can delete it whenever they like, nobody at Fitness Guide may read it,
 * it is shared only when the member sends it to a named doctor or trainer, and
 * it lives only as long as the account.
 *
 * What the code actually delivers, stated honestly: no feature reads it, no
 * admin query touches those tables, and deleting the account erases it. What
 * the code does NOT deliver is protection from someone holding the database
 * credentials. Rule 2 is satisfied at the level of the application, not at the
 * level of the storage — see the decisions doc for what closing that needs.
 *
 * ## Why free text and not tick-boxes
 *
 * "Do you have allergies?" has a thousand answers. A member describing theirs
 * in their own words is worth far more to a doctor than a list of conditions we
 * guessed at — and a checklist quietly tells people that anything not on it
 * does not count.
 *
 * ## The folder
 *
 * Closed by default, as Emad asked: "a closed file that opens when tapped".
 * A `<details>` element, so the browser does the opening with no JavaScript.
 */

const QUESTIONS: readonly {
  key: keyof MedicalAnswers;
  label: TranslationKey;
  placeholder?: TranslationKey;
  long: boolean;
}[] = [
  {
    key: "allergies",
    label: "medical.allergies",
    placeholder: "medical.allergiesPlaceholder",
    long: true,
  },
  {
    key: "disabilities",
    label: "medical.disabilities",
    placeholder: "medical.disabilitiesPlaceholder",
    long: true,
  },
  {
    key: "chronicInjuries",
    label: "medical.chronicInjuries",
    placeholder: "medical.chronicInjuriesPlaceholder",
    long: true,
  },
  {
    key: "medications",
    label: "medical.medications",
    placeholder: "medical.medicationsPlaceholder",
    long: true,
  },
  { key: "bloodType", label: "medical.bloodType", long: false },
  { key: "notes", label: "medical.notes", long: true },
];

const MAX_REPORTS = 6;

/** Reads a chosen file as a data URI, shrinking it first if it is an image. */
async function fileToDataUri(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read the file"));
      reader.readAsDataURL(file);
    });
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

/**
 * Opens a stored report in a new tab.
 *
 * ## Why this is a function and not a link
 *
 * The first version was `<a href="data:application/pdf;base64,…">`. Chrome
 * refuses to open a `data:` address as a page — a deliberate security rule,
 * because a data URL can carry a whole HTML document from anywhere — and it
 * refuses SILENTLY. The click did nothing and said nothing. That was Emad's
 * "you cannot show the report".
 *
 * A Blob URL is the same bytes under a `blob:` address that belongs to this
 * page, and the browser will open that. It is made at the moment of the click
 * and released a minute later, so a member opening six reports does not leave
 * six copies pinned in memory.
 */
function openReport(dataUri: string) {
  const [meta, base64] = dataUri.split(",");
  const mime = meta?.match(/^data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const bytes = Uint8Array.from(atob(base64 ?? ""), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function MedicalFile({
  locale,
  answers,
  reports,
}: {
  locale: Locale;
  answers: MedicalAnswers | null;
  reports: readonly MedicalReportRow[];
}) {
  const t = createTranslator(locale);
  const [state, action, pending] = useActionState<PrivateState, FormData>(
    saveMedicalFile,
    {},
  );
  const [reportState, reportAction, reportPending] = useActionState<
    PrivateState,
    FormData
  >(addMedicalReport, {});

  const [content, setContent] = useState<string | null>(null);
  const [pickError, setPickError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Forget the chosen file once it is saved. Without this the previous file
  // stayed selected, the title cleared, and pressing Add again produced a
  // confusing error — Emad's "upload works only once".
  //
  // Same recipe as PhotoGallery: compare during render, not in an effect.
  const [seenReport, setSeenReport] = useState(reportState);
  if (reportState !== seenReport) {
    setSeenReport(reportState);
    if (reportState.saved) setContent(null);
  }

  const full = reports.length >= MAX_REPORTS;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickError(false);
    try {
      setContent(await fileToDataUri(file));
    } catch {
      setPickError(true);
    }
    e.target.value = "";
  }

  return (
    <details className={styles.folder}>
      <summary className={styles.folderSummary}>
        <span className={styles.cardTitle}>{t("medical.title")}</span>
        <span className={styles.folderCount}>{reports.length}</span>
        <span className={styles.folderOpen}>{t("medical.open")}</span>
      </summary>

      <div className={styles.folderBody}>
        <p className={styles.privacy}>{t("medical.hint")}</p>
        <p className={styles.hint}>{t("medical.purpose")}</p>

        <form action={action}>
          <input type="hidden" name="locale" value={locale} />

          {QUESTIONS.map((q) => (
            <div key={q.key} className={styles.field}>
              <label className={styles.label} htmlFor={q.key}>
                {t(q.label)}
              </label>
              {q.long ? (
                <textarea
                  id={q.key}
                  name={q.key}
                  rows={2}
                  maxLength={500}
                  defaultValue={answers?.[q.key] ?? ""}
                  placeholder={q.placeholder ? t(q.placeholder) : undefined}
                  className={styles.textarea}
                />
              ) : (
                <input
                  id={q.key}
                  name={q.key}
                  type="text"
                  maxLength={500}
                  defaultValue={answers?.[q.key] ?? ""}
                  className={styles.input}
                />
              )}
            </div>
          ))}

          <div className={styles.actions}>
            <button type="submit" className={styles.submit} disabled={pending}>
              {pending ? t("common.loading") : t("medical.save")}
            </button>
            {state.saved && <span className={styles.ok}>{t("medical.saved")}</span>}
            {state.error && (
              <span className={styles.error} role="alert">
                {state.error}
              </span>
            )}
          </div>
        </form>

        {answers && (
          <form action={eraseMedicalFile} className={styles.eraseRow}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className={styles.linkBtn}>
              {t("medical.erase")}
            </button>
          </form>
        )}

        <h3 className={styles.subTitle}>{t("medical.reports")}</h3>
        <p className={styles.hint}>{t("medical.reportsHint")}</p>

        {full ? (
          <p className={styles.hint}>{t("medical.reportsFull")}</p>
        ) : (
          <form action={reportAction} className={styles.weightForm}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="content" value={content ?? ""} />

            <div className={styles.field}>
              <label className={styles.label} htmlFor="title">
                {t("medical.reportTitle")}
              </label>
              <input
                id="title"
                name="title"
                type="text"
                maxLength={80}
                placeholder={t("medical.reportTitlePlaceholder")}
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={onPick}
                className={styles.file}
                aria-label={t("medical.reportPick")}
              />
              <button
                type="button"
                className={styles.secondary}
                onClick={() => fileRef.current?.click()}
              >
                {content ? "✓ " : ""}
                {t("medical.reportPick")}
              </button>
            </div>

            <button
              type="submit"
              className={styles.secondary}
              disabled={reportPending || content === null}
            >
              {reportPending ? t("common.loading") : t("medical.reportAdd")}
            </button>
          </form>
        )}

        {(pickError || reportState.error) && (
          <p className={styles.error} role="alert">
            {pickError ? t("medical.reportInvalid") : reportState.error}
          </p>
        )}

        {reports.length === 0 ? (
          <p className={styles.hint}>{t("medical.reportsNone")}</p>
        ) : (
          <ul className={styles.weightList}>
            {reports.map((r) => (
              <li key={r.id} className={styles.weightRow}>
                <span className={styles.reportTitle}>
                  {r.title || t("medical.untitled")}
                </span>
                <span className={styles.weightDate}>
                  {formatDate(r.uploadedAt, locale)}
                </span>
                <button
                  type="button"
                  className={styles.dangerSmall}
                  onClick={() => openReport(r.content)}
                >
                  {t("medical.reportOpen")}
                </button>
                <form action={removeMedicalReport}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className={styles.dangerSmall}>
                    {t("medical.reportRemove")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
