"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_LOCALE, createTranslator, isLocale } from "@fg/i18n";

import { requireUser } from "@/lib/dal";
import {
  addPhoto,
  addReport,
  deleteMedical,
  deletePhoto,
  deleteReport,
  photoCountFor,
  reportCountFor,
  saveMedical,
} from "@/lib/db";

/**
 * The member's private things: their own photos, and their health answers.
 *
 * ## Every action here writes to the signed-in member and nobody else
 *
 * `requireUser()` first, then that id. No action accepts a user id, so there is
 * no version of any of these that could be aimed at another account. The only
 * ids that arrive from a form are a photo's and a report's, and both deletes
 * put the owner in the query rather than checking after the fetch.
 *
 * ## The caps, and why they exist
 *
 * These files are stored inside the database row, base64-encoded. That is a
 * fair trade for one small avatar and a stretch for a gallery — see the note at
 * the bottom of schema.prisma. The caps below keep it survivable on a free
 * database. They are not a product decision, and they are the first thing to
 * revisit when this moves to object storage.
 */

const MAX_PHOTOS = 12;
const MAX_REPORTS = 6;

/** A shrunk photo. The browser resizes to 720px, which lands near 100 KB. */
const MAX_PHOTO_BYTES = 400_000;
/** A report: a shrunk image, or a small PDF that cannot be shrunk at all. */
const MAX_REPORT_BYTES = 700_000;

const IMAGE_URI = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
const PDF_URI = /^data:application\/pdf;base64,[A-Za-z0-9+/]+=*$/;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const orNull = (v: string) => (v === "" ? null : v);

export interface PrivateState {
  readonly error?: string;
  readonly saved?: boolean;
}

// ─────────────────────────────────────────────────────────────── the gallery

export async function addProgressPhoto(
  _prev: PrivateState,
  formData: FormData,
): Promise<PrivateState> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = createTranslator(locale);
  const user = await requireUser(locale);

  const image = str(formData, "image");
  if (image === "" || !IMAGE_URI.test(image) || image.length > MAX_PHOTO_BYTES) {
    return { error: t("gallery.photoInvalid") };
  }

  // Counted here rather than trusted from the page, because the page's count
  // was right when it rendered and this request arrives later.
  if ((await photoCountFor(user.id)) >= MAX_PHOTOS) {
    return { error: t("gallery.full") };
  }

  const takenOn = str(formData, "takenOn") || new Date().toISOString().slice(0, 10);
  const d = new Date(takenOn);
  if (Number.isNaN(d.getTime()) || d > new Date()) {
    return { error: t("gallery.dateInvalid") };
  }

  const note = orNull(str(formData, "note"));
  if (note !== null && note.length > 120) {
    return { error: t("gallery.noteInvalid") };
  }

  await addPhoto(user.id, image, takenOn, note);
  revalidatePath(`/${locale}/account`);
  return { saved: true };
}

export async function removeProgressPhoto(formData: FormData): Promise<void> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const user = await requireUser(locale);

  const id = str(formData, "id");
  if (id !== "") await deletePhoto(user.id, id);

  revalidatePath(`/${locale}/account`);
}

// ───────────────────────────────────────────────────────── the medical file

/** Each answer is free text. Long enough to be useful, short enough to bound. */
const MAX_ANSWER = 500;

export async function saveMedicalFile(
  _prev: PrivateState,
  formData: FormData,
): Promise<PrivateState> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = createTranslator(locale);
  const user = await requireUser(locale);

  // Six fields, one rule, so one loop. `Object.fromEntries` turns the pairs
  // back into an object — the reverse of `Object.entries`.
  const keys = [
    "allergies",
    "disabilities",
    "chronicInjuries",
    "medications",
    "bloodType",
    "notes",
  ] as const;

  const answers: Record<string, string | null> = {};
  for (const key of keys) {
    const v = str(formData, key);
    if (v.length > MAX_ANSWER) return { error: t("medical.tooLong") };
    answers[key] = orNull(v);
  }

  await saveMedical(user.id, {
    allergies: answers.allergies ?? null,
    disabilities: answers.disabilities ?? null,
    chronicInjuries: answers.chronicInjuries ?? null,
    medications: answers.medications ?? null,
    bloodType: answers.bloodType ?? null,
    notes: answers.notes ?? null,
  });

  revalidatePath(`/${locale}/account`);
  return { saved: true };
}

/** Rule 1: the member can delete it at any time. */
export async function eraseMedicalFile(formData: FormData): Promise<void> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const user = await requireUser(locale);

  await deleteMedical(user.id);
  revalidatePath(`/${locale}/account`);
}

export async function addMedicalReport(
  _prev: PrivateState,
  formData: FormData,
): Promise<PrivateState> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = createTranslator(locale);
  const user = await requireUser(locale);

  const title = str(formData, "title");
  if (title.length < 2 || title.length > 80) {
    return { error: t("medical.titleInvalid") };
  }

  const content = str(formData, "content");
  const isImage = IMAGE_URI.test(content);
  const isPdf = PDF_URI.test(content);

  if (content === "" || (!isImage && !isPdf)) {
    return { error: t("medical.reportInvalid") };
  }
  if (content.length > MAX_REPORT_BYTES) {
    // A separate message from "invalid", because "too big" is a problem the
    // member can actually do something about.
    return { error: t("medical.reportTooBig") };
  }

  if ((await reportCountFor(user.id)) >= MAX_REPORTS) {
    return { error: t("medical.reportsFull") };
  }

  await addReport(user.id, title, content, isPdf ? "pdf" : "image");
  revalidatePath(`/${locale}/account`);
  return { saved: true };
}

export async function removeMedicalReport(formData: FormData): Promise<void> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const user = await requireUser(locale);

  const id = str(formData, "id");
  if (id !== "") await deleteReport(user.id, id);

  revalidatePath(`/${locale}/account`);
}
