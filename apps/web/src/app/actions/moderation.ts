"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_LOCALE, isLocale } from "@fg/i18n";

import { requireAdmin } from "@/lib/dal";
import { adminDeleteComment, adminDeletePhoto, dismissReport } from "@/lib/db";

/**
 * What an admin does with a report: remove the thing, or leave it.
 *
 * `requireAdmin()` first, every time. The page already checked before it
 * rendered the buttons, but a Server Action is a public endpoint and the
 * page's check protects the view, not the write.
 *
 * ## What an admin cannot do from here
 *
 * Reach a private photo. `adminDeletePhoto` refuses to delete one — the
 * visibility filter sits inside its own query — and no report can be raised on
 * one in the first place, because a report button only ever appears on
 * something visible. Moderation exists inside the medical rules, not as an
 * exception to them.
 */

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export async function dismiss(formData: FormData): Promise<void> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  await requireAdmin(locale);

  const id = str(formData, "id");
  if (id !== "") await dismissReport(id);

  revalidatePath(`/${locale}/admin/reports`);
}

/**
 * Removes the reported thing. Deleting it takes every report on it along, via
 * the cascade, so there is nothing separate to close.
 */
export async function removeReported(formData: FormData): Promise<void> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  await requireAdmin(locale);

  const photoId = str(formData, "photoId");
  const commentId = str(formData, "commentId");

  if (commentId !== "") await adminDeleteComment(commentId);
  else if (photoId !== "") await adminDeletePhoto(photoId);

  revalidatePath(`/${locale}/admin/reports`);
  revalidatePath(`/${locale}/feed`);
}
