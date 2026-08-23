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

const str = (fd: FormData, key: string): string => String(fd.get(key) ?? "").trim();

export async function saveGymProfile(
  _prev: EditState,
  formData: FormData,
): Promise<EditState> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const slug = str(formData, "slug");

  await requireGymAccess(slug, locale);

  const required = ["nameAr", "nameEn", "areaAr", "areaEn"] as const;
  for (const field of required) {
    if (str(formData, field) === "") {
      return {
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
    amenities: formData.getAll("amenities").map(String),
  });

  if (result === null) {
    return { error: locale === "ar" ? "لم يتم العثور على النادي" : "Gym not found" };
  }

  // The public gym page and the admin list both show this data.
  revalidatePath(`/${locale}/gyms/${slug}`);
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/explore`);

  return { saved: true, storage: result };
}

export async function savePlan(_prev: EditState, formData: FormData): Promise<EditState> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const slug = str(formData, "slug");
  const planId = str(formData, "planId");

  await requireGymAccess(slug, locale);

  // Prices go through parseKwd, so "19.900" becomes 19900 fils and anything
  // that is not a valid KWD amount is rejected rather than silently rounded.
  let listPrice: number;
  let offerPrice: number | null = null;
  try {
    listPrice = parseKwd(str(formData, "listPrice"));
    const rawOffer = str(formData, "offerPrice");
    offerPrice = rawOffer === "" ? null : parseKwd(rawOffer);
  } catch {
    return {
      error:
        locale === "ar"
          ? "السعر غير صحيح. استخدم صيغة مثل 19.900"
          : "Invalid price. Use a format like 19.900",
    };
  }

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
    active: formData.get("active") !== null,
  });

  if (result === null) {
    return { error: locale === "ar" ? "لم يتم العثور على الباقة" : "Plan not found" };
  }

  revalidatePath(`/${locale}/gyms/${slug}`);
  revalidatePath(`/${locale}`);

  return { saved: true, storage: result };
}
