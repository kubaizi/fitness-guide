"use server";

import { redirect } from "next/navigation";
import { normalizeKuwaitPhone, verifyPassword } from "@fg/core";
import { DEFAULT_LOCALE, isLocale } from "@fg/i18n";
import { findUserForLogin } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";

/**
 * Username-or-phone plus password.
 *
 * The identifier field accepts either, because people remember one or the
 * other: a phone number is typed as "51338855" but stored as "+96551338855",
 * so it is normalised before comparing. The admin account has no phone and
 * signs in by username only.
 */

export interface AuthState {
  readonly error?: string;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Deliberately one message for every failure. Saying "no such user" would
  // let anyone probe which usernames and phone numbers exist.
  const failed =
    locale === "ar"
      ? "اسم المستخدم أو كلمة المرور غير صحيحة"
      : "Incorrect username or password";

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

  await createSession(user.id);
  redirect(`/${locale}/memberships`);
}

export async function signOut(formData: FormData): Promise<void> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  await destroySession();
  redirect(`/${locale}`);
}
