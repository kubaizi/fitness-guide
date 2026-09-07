"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_LOCALE, createTranslator, isLocale } from "@fg/i18n";

import { requireUser } from "@/lib/dal";
import { deleteWeight, recordWeight, updateProfile, type ProfileInput } from "@/lib/db";

/**
 * The member editing their own profile.
 *
 * ## The security shape of this file
 *
 * Every action starts with `requireUser()` and writes to **that** id. No action
 * takes a user id as an argument, so there is no version of these that could be
 * pointed at somebody else's account. A Server Action is a public endpoint;
 * anyone can post to it with any payload, and the only thing standing between
 * that and another member's data is where the id comes from.
 *
 * The one id that does arrive from the form is a weight entry's, and
 * `deleteWeight` scopes the delete by owner in the query itself rather than
 * fetching the row and checking afterwards.
 */

export interface ProfileState {
  readonly error?: string;
  readonly saved?: boolean;
  /** Which field to point at, so the message lands beside the right box. */
  readonly field?: string;
}

/** Reads a form field as a trimmed string. */
const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Empty means "not set", which the database stores as null rather than "". */
// One representation for absence. Without this, a cleared box would save an
// empty string, and every screen would then have to test for both `null` and
// `""` — which is exactly the sort of thing that gets missed on one screen.
const orNull = (v: string) => (v === "" ? null : v);

/**
 * A social handle: letters, digits, dot, underscore. Up to 30.
 *
 * Deliberately not a URL. The link is built from this, so whatever is stored
 * can only ever point at that one network — where a URL field would happily
 * accept `javascript:alert(1)` or a link to anywhere on the internet, and we
 * would be rendering it on the member's own page.
 *
 * A leading "@" is stripped rather than rejected, because that is how people
 * write a handle.
 */
const HANDLE = /^[A-Za-z0-9._]{1,30}$/;

function handle(raw: string): string | null | "invalid" {
  const v = raw.replace(/^@/, "");
  if (v === "") return null;
  return HANDLE.test(v) ? v : "invalid";
}

/**
 * A picture the browser has already shrunk, as a data URI.
 *
 * Checked on three counts, because this string goes into the page's HTML for
 * anyone who later views the profile:
 *
 *   1. It must be a JPEG, PNG or WebP data URI. `data:text/html,...` is inert
 *      inside an <img>, but storing it would be storing someone's markup.
 *   2. The tail must be base64 and nothing else.
 *   3. It must be small. The browser resizes to 256px before sending, so
 *      anything over 300 KB did not come from our form.
 */
const PHOTO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
const MAX_PHOTO_BYTES = 300_000;

export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = createTranslator(locale);

  // Who is signed in — from the session cookie, never from the form.
  const user = await requireUser(locale);

  const name = str(formData, "name");
  if (name.length < 2 || name.length > 60) {
    return { error: t("profile.nameInvalid"), field: "name" };
  }

  // Deliberately loose. Email validation by regular expression is a famous
  // rabbit hole — the real specification allows things no form ever sees — and
  // a pattern strict enough to be satisfying rejects addresses that work. The
  // only test that settles it is sending a message to it, which is a later job.
  const email = orNull(str(formData, "email"));
  if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: t("profile.emailInvalid"), field: "email" };
  }

  const dateOfBirth = orNull(str(formData, "dateOfBirth"));
  if (dateOfBirth !== null) {
    const d = new Date(dateOfBirth);
    // `Number.isNaN(d.getTime())` is how you test a Date — an unparseable date
    // is not null or undefined, it is an "Invalid Date" object whose time is
    // NaN. And NaN is the one value in JavaScript not equal to itself, so it
    // cannot be found with `===`.
    const bad = Number.isNaN(d.getTime()) || d > new Date() || d < new Date("1900-01-01");
    if (bad) return { error: t("profile.dobInvalid"), field: "dateOfBirth" };
  }

  const occupation = orNull(str(formData, "occupation"));
  if (occupation !== null && occupation.length > 60) {
    return { error: t("profile.occupationInvalid"), field: "occupation" };
  }

  const photoRaw = str(formData, "photo");
  let photo: string | null = null;
  if (photoRaw !== "") {
    if (photoRaw.length > MAX_PHOTO_BYTES || !PHOTO.test(photoRaw)) {
      return { error: t("profile.photoInvalid"), field: "photo" };
    }
    photo = photoRaw;
  }

  // Four handles, one rule, so one loop rather than four near-identical blocks.
  const socials: Record<string, string | null> = {};
  for (const key of ["instagram", "x", "snapchat", "tiktok"]) {
    const h = handle(str(formData, key));
    if (h === "invalid") return { error: t("profile.handleInvalid"), field: key };
    socials[key] = h;
  }

  const input: ProfileInput = {
    name,
    email,
    dateOfBirth,
    occupation,
    photo,
    instagram: socials.instagram ?? null,
    x: socials.x ?? null,
    snapchat: socials.snapchat ?? null,
    tiktok: socials.tiktok ?? null,
  };

  const outcome = await updateProfile(user.id, input);

  if (!outcome.saved) {
    return outcome.reason === "email_taken"
      ? { error: t("profile.emailTaken"), field: "email" }
      : { error: t("profile.saveFailed") };
  }

  // The header shows the member's name and will be stale otherwise.
  revalidatePath(`/${locale}`, "layout");
  return { saved: true };
}

export interface WeightState {
  readonly error?: string;
  readonly saved?: boolean;
}

/** Kilograms as typed, e.g. "82.5", to whole grams. */
// The same rule as money: store an integer of the smallest unit, never a
// float. 82.5 kg becomes 82500 g. `Math.round` rather than a cast, so "82.4567"
// lands on the nearest gram instead of being chopped.
function toGrams(raw: string): number | null {
  const kg = Number(raw.replace(",", "."));
  if (!Number.isFinite(kg) || kg <= 0 || kg > 400) return null;
  return Math.round(kg * 1000);
}

export async function logWeight(
  _prev: WeightState,
  formData: FormData,
): Promise<WeightState> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = createTranslator(locale);
  const user = await requireUser(locale);

  const grams = toGrams(str(formData, "kg"));
  if (grams === null) return { error: t("profile.weightInvalid") };

  // Defaults to today when the date box is left alone, which is what someone
  // stepping off the scales means.
  const measuredOn = str(formData, "measuredOn") || new Date().toISOString().slice(0, 10);
  const d = new Date(measuredOn);
  if (Number.isNaN(d.getTime()) || d > new Date()) {
    return { error: t("profile.weightDateInvalid") };
  }

  await recordWeight(user.id, grams, measuredOn);
  revalidatePath(`/${locale}/account`);
  return { saved: true };
}

/** Removes one weighing. */
export async function removeWeight(formData: FormData): Promise<void> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const user = await requireUser(locale);

  const id = str(formData, "id");
  if (id !== "") await deleteWeight(user.id, id);

  revalidatePath(`/${locale}/account`);
}
