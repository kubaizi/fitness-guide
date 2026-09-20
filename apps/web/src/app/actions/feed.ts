"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_LOCALE, createTranslator, isLocale } from "@fg/i18n";

import { getCurrentUser } from "@/lib/dal";
import { addComment, deleteComment, reportContent, toggleLike } from "@/lib/db";

/**
 * What a member can do on somebody else's photo: like it, comment, report it.
 *
 * ## Who may act
 *
 * Emad's answer: only people who signed up as members. A gym owner can look at
 * what is public, like anyone on the web, and no further. So each action
 * checks `role === "member"` rather than merely "signed in", and a visitor
 * with no session is sent to the member door.
 *
 * ## What they may act on
 *
 * Nothing here checks visibility itself. Each database function takes the
 * viewer and puts the visibility filter in its own query, so a like or a
 * comment on a photo the member cannot see simply finds no photo. There is no
 * check up here that could be forgotten.
 */

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export interface FeedState {
  readonly error?: string;
}

/** The signed-in member, or null for anyone who is not one. */
async function member() {
  const user = await getCurrentUser();
  return user?.role === "member" ? user : null;
}

export async function likePhoto(formData: FormData): Promise<void> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const me = await member();
  if (!me) return;

  const photoId = str(formData, "photoId");
  if (photoId !== "") await toggleLike(me, photoId);

  revalidatePath(`/${locale}/feed`);
  revalidatePath(`/${locale}/feed/${photoId}`);
}

const MAX_COMMENT = 300;

export async function commentOnPhoto(
  _prev: FeedState,
  formData: FormData,
): Promise<FeedState> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = createTranslator(locale);

  const me = await member();
  if (!me) return { error: t("feed.signInToComment") };

  const photoId = str(formData, "photoId");
  const body = str(formData, "body");
  if (body.length < 1 || body.length > MAX_COMMENT) {
    return { error: t("feed.commentInvalid") };
  }

  const ok = await addComment(me, photoId, body);
  if (!ok) return { error: t("feed.commentFailed") };

  revalidatePath(`/${locale}/feed`);
  revalidatePath(`/${locale}/feed/${photoId}`);
  return {};
}

export async function removeComment(formData: FormData): Promise<void> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const me = await member();
  if (!me) return;

  const id = str(formData, "id");
  const photoId = str(formData, "photoId");
  if (id !== "") await deleteComment(me.id, id);

  revalidatePath(`/${locale}/feed`);
  revalidatePath(`/${locale}/feed/${photoId}`);
}

/**
 * Flags a photo or a comment for an admin.
 *
 * No feedback beyond "thanks" on purpose. Telling the reporter what happened
 * next — removed, dismissed — turns the report button into a way to find out
 * whether an admin agrees with you, which is not what it is for.
 */
export async function reportPhotoOrComment(
  _prev: FeedState,
  formData: FormData,
): Promise<FeedState> {
  const rawLocale = str(formData, "locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = createTranslator(locale);

  const me = await member();
  if (!me) return { error: t("feed.signInToReport") };

  const photoId = str(formData, "photoId");
  const commentId = str(formData, "commentId");
  const reason = str(formData, "reason").slice(0, 200) || null;

  if (commentId !== "") {
    await reportContent(me.id, { commentId }, reason);
  } else if (photoId !== "") {
    await reportContent(me.id, { photoId }, reason);
  } else {
    return { error: t("feed.reportFailed") };
  }

  return {};
}
