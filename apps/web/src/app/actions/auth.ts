"use server";

import { redirect } from "next/navigation";
import { normalizeKuwaitPhone, verifyPassword } from "@fg/core";
import { DEFAULT_LOCALE, createTranslator, isLocale } from "@fg/i18n";
import { findUserForLogin, findUserById } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { doorFor, landingFor, type Door } from "@/lib/roles";

/**
 * Username-or-phone plus password, on one of two doors.
 *
 * The identifier field accepts either, because people remember one or the
 * other: a phone number is typed as "51338855" but stored as "+96551338855",
 * so it is normalised before comparing. The admin account has no phone and
 * signs in by username only.
 *
 * The form says which door it is — member or partner — and an account may only
 * use its own. See lib/roles.ts for why the doors are separate.
 */

export interface AuthState {
  readonly error?: string;
  /** Set when the credentials were right but the door was wrong. */
  readonly wrongDoor?: Door;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = createTranslator(locale);

  const rawDoor = String(formData.get("door") ?? "");
  const door: Door = rawDoor === "partner" ? "partner" : "member";

  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Deliberately one message for every credential failure. Saying "no such
  // user" would let anyone probe which usernames and phone numbers exist.
  const failed = t("auth.failed");

  if (identifier === "" || password === "") return { error: failed };

  // Try the identifier as typed, then as a normalised phone number.
  const asPhone = normalizeKuwaitPhone(identifier);
  const user =
    findUserForLogin(identifier) ?? (asPhone ? findUserForLogin(asPhone) : null);

  if (!user) return { error: failed };

  const ok = verifyPassword(password, {
    salt: user.passwordSalt,
    hash: user.passwordHash,
  });
  if (!ok) return { error: failed };

  /*
   * Right password, wrong door.
   *
   * This is NOT a security boundary — the account is genuine and the password
   * was correct, so no session is created and nothing is leaked that the
   * person did not already know. It is a signpost: it tells someone who
   * bookmarked the wrong page where to go instead, rather than letting a gym
   * owner land on an empty "My memberships" and conclude the site is broken.
   */
  if (doorFor(user.role) !== door) {
    return {
      error: door === "member" ? t("auth.wrongDoorMember") : t("auth.wrongDoorPartner"),
      wrongDoor: doorFor(user.role),
    };
  }

  await createSession(user.id);

  // findUserById returns the public shape landingFor expects — no hash in it.
  const signedIn = findUserById(user.id);
  redirect(signedIn ? landingFor(signedIn, locale) : `/${locale}`);
}

export async function signOut(formData: FormData): Promise<void> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  await destroySession();
  redirect(`/${locale}`);
}
