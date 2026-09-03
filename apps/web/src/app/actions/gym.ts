// See src/app/actions/auth.ts for the full explanation of what "use server"
// does and why a Server Action must re-check permission.
"use server";

import { revalidatePath } from "next/cache";
import { parseKwd } from "@fg/core";
import { DEFAULT_LOCALE, isLocale } from "@fg/i18n";
import { requireGymAccess } from "@/lib/dal";
import { updateGymProfile, updatePlan } from "@/lib/db";

/**
 * Gym-facing edits.
 *
 * Every action re-checks permission with requireGymAccess. The page already
 * checked before rendering the form, but a Server Action is a public endpoint
 * — anyone can post to it — so the page's check protects the view, not the
 * write.
 */

export interface EditState {
  readonly error?: string;
  readonly saved?: boolean;
  /** Whether the change reached disk or only this server's memory. */
  readonly storage?: "file" | "memory";
}

// A tiny helper to cut the repetition of reading a form field. Called about
// twenty times below, so it earns its place.
//
// `fd` and `key` in, a trimmed string out — never null, never a File.
const str = (fd: FormData, key: string): string => String(fd.get(key) ?? "").trim();

export async function saveGymProfile(
  _prev: EditState,
  formData: FormData,
): Promise<EditState> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const slug = str(formData, "slug");

  // ── THE AUTHORISATION CHECK, and note where it sits ──
  // First, before anything is read or written. `requireGymAccess` redirects
  // or 404s if this user may not edit this gym (see lib/dal.ts), so if
  // execution continues past this line, permission is established.
  //
  // The `slug` came from the form, i.e. from the browser. That is fine
  // BECAUSE of this line: requireGymAccess compares it against the gym the
  // signed-in account is actually attached to. Posting another gym's slug by
  // hand fails here.
  await requireGymAccess(slug, locale);

  // Validation. `as const` makes this a tuple of literal strings, so `field`
  // in the loop is typed as those four names rather than plain `string`.
  const required = ["nameAr", "nameEn", "areaAr", "areaEn"] as const;
  for (const field of required) {
    if (str(formData, field) === "") {
      return {
        // Written inline rather than through `t()`. These two strings exist
        // only here, and adding a dictionary key for a message this local
        // would be more indirection than it is worth.
        error: locale === "ar" ? "الحقول المطلوبة ناقصة" : "Required fields are missing",
      };
    }
  }

  const result = await updateGymProfile(slug, {
    nameAr: str(formData, "nameAr"),
    nameEn: str(formData, "nameEn"),
    descriptionAr: str(formData, "descriptionAr"),
    descriptionEn: str(formData, "descriptionEn"),
    areaAr: str(formData, "areaAr"),
    areaEn: str(formData, "areaEn"),
    addressAr: str(formData, "addressAr"),
    addressEn: str(formData, "addressEn"),
    hoursAr: str(formData, "hoursAr"),
    hoursEn: str(formData, "hoursEn"),
    governorate: str(formData, "governorate"),
    access: str(formData, "access"),
    // `.getAll` rather than `.get` — amenities is a set of checkboxes sharing
    // one name, so there are many values under that key. `.get` would return
    // only the first. `.map(String)` then coerces each one.
    amenities: formData.getAll("amenities").map(String),
  });

  if (result === null) {
    return { error: locale === "ar" ? "لم يتم العثور على النادي" : "Gym not found" };
  }

  // ── `revalidatePath` ──
  // Next.js caches rendered pages aggressively. After changing the underlying
  // data, those cached copies are stale — so this tells Next to throw away
  // the cached version of each path and re-render it on the next visit.
  //
  // Forgetting this is one of the most common Next.js bugs: the save works,
  // the database is correct, and the page still shows the old value. Every
  // path that displays the changed data needs a line here.
  //
  // The public gym page and the admin list both show this data.
  revalidatePath(`/${locale}/gyms/${slug}`);
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/gyms`);

  // `storage` is passed back so the editor can tell the user honestly whether
  // the change reached disk or lives only in this server's memory — see the
  // note about serverless filesystems in lib/db.ts.
  return { saved: true, storage: result };
}

export async function savePlan(_prev: EditState, formData: FormData): Promise<EditState> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const slug = str(formData, "slug");
  const planId = str(formData, "planId");

  // Again first, before any work. Note it checks the GYM, and the plan is
  // then updated by id — see the note further down about what that implies.
  await requireGymAccess(slug, locale);

  // Prices go through parseKwd, so "19.900" becomes 19900 fils and anything
  // that is not a valid KWD amount is rejected rather than silently rounded.
  //
  // `let` with no initial value, plus an explicit type, because the
  // assignment happens inside the `try`. `offerPrice` is initialised to null
  // since it is genuinely optional.
  let listPrice: number;
  let offerPrice: number | null = null;
  try {
    // parseKwd THROWS on bad input rather than returning null (see
    // packages/core/src/money.ts), which is why this needs a try/catch. Both
    // parses share one, since either failing means the same thing to the user.
    listPrice = parseKwd(str(formData, "listPrice"));
    const rawOffer = str(formData, "offerPrice");
    // Empty is meaningful here: it means "no offer", not "an invalid offer".
    offerPrice = rawOffer === "" ? null : parseKwd(rawOffer);
  } catch {
    return {
      error:
        locale === "ar"
          ? "السعر غير صحيح. استخدم صيغة مثل 19.900"
          : "Invalid price. Use a format like 19.900",
    };
  }

  // A BUSINESS RULE, not a format check — which is why it lives here rather
  // than in parseKwd. An "offer" that costs more than the normal price is
  // well-formed and still nonsense.
  if (offerPrice !== null && offerPrice >= listPrice) {
    return {
      error:
        locale === "ar"
          ? "سعر العرض يجب أن يكون أقل من السعر الأساسي"
          : "The offer price must be lower than the list price",
    };
  }

  const result = await updatePlan(planId, {
    nameAr: str(formData, "nameAr"),
    nameEn: str(formData, "nameEn"),
    listPrice,
    offerPrice,
    // ── How an HTML checkbox actually submits ──
    // A ticked checkbox sends its value; an unticked one sends NOTHING AT
    // ALL — the key is simply absent from the FormData. So the test for
    // "checked" is "is the key present", i.e. `!== null`.
    //
    // This trips people up constantly: there is no `false` to read, only an
    // absence. `Boolean(formData.get("active"))` happens to work here, but
    // would break for a checkbox whose value is the string "false".
    active: formData.get("active") !== null,
  });

  if (result === null) {
    return { error: locale === "ar" ? "لم يتم العثور على الباقة" : "Plan not found" };
  }

  revalidatePath(`/${locale}/gyms/${slug}`);
  revalidatePath(`/${locale}`);

  return { saved: true, storage: result };
}
