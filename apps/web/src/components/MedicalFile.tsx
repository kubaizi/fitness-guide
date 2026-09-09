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
 * level of the storage, and closing that gap needs encryption with a key the
 * platform does not hold. That is a real piece of work and it is not done.
 *
 * ## Why free text and not tick-boxes
 *
 * "Do you have allergies?" has a thousand answers. A member describing theirs
 * in their own words is worth far more to a doctor than a list of conditions we
 * guessed at — and a checklist quietly tells people that anything not on it
 * does not count.
 */

/** The six questions, in the order they are asked. */
// A list rather than six copies of the same markup, so the questions can be
// reordered or added to in one place. `placeholder` is optional because two of
// them do not need an example.
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
// A PDF cannot be shrunk in the browser, so it passes through as it is and the
// server refuses it if it is too big. An image gets scaled to 1200px, which is
// enough to read a printed lab result.
async function fileToDataUri(file: File): Promise<{ uri: string; isPdf: boolean }> {
  if (file.type === "application/pdf") {
    // FileReader is the older callback API, so it is wrapped in a Promise to
    // sit alongside the `await` used everywhere else.
    const uri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read the file"));
      reader.readAsDataURL(file);
    });
    return { uri, isPdf: true };
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

  return { uri: canvas.toDataURL("image/jpeg", 0.8), isPdf: false };
}

export function MedicalFile({
  locale,
  answers,
  reports,
}: {
  locale: Locale;
  /** Null when the member has never answered anything. */
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

  const full = reports.length >= MAX_REPORTS;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickError(false);
    try {
      const { uri } = await fileToDataUri(file);
      setContent(uri);
    } catch {
      setPickError(true);
    }
    e.target.value = "";
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{t("medical.title")}</h2>
      <p className={styles.privacy}>{t("medical.hint")}</p>
      <p className={styles.hint}>{t("medical.purpose")}</p>

      <form action={action}>
        <input type="hidden" name="locale" value={locale} />

        {QUESTIONS.map((q) => (
          <div key={q.key} className={styles.field}>
            <label className={styles.label} htmlFor={q.key}>
              {t(q.label)}
            </label>
            {/* A textarea for the answers people write a sentence to, a plain
                input for a blood type, which is three characters. */}
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

      {/* Rule 1, made real: the member can erase the whole thing whenever they
          like. Offered only when there is something to erase. */}
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
              <span className={styles.reportTitle}>{r.title}</span>
              <span className={styles.weightDate}>
                {formatDate(r.uploadedAt, locale)}
              </span>
              {/* Opens in a new tab rather than trying to preview a PDF inline.
                  `rel` for the usual reasons, even though the target is a data
                  URI from our own database rather than another site. */}
              <a
                href={r.content}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.linkBtn}
              >
                {t("medical.reportOpen")}
              </a>
              <form action={removeMedicalReport}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className={styles.linkBtn}>
                  {t("medical.reportRemove")}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
