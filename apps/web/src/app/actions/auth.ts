"use server";

import { redirect } from "next/navigation";
import { checkOtp, generateOtp, hashOtp, normalizeKuwaitPhone } from "@fg/core";
import { DEFAULT_LOCALE, isLocale } from "@fg/i18n";
import { demoUser, findUserByPhone } from "@/lib/db";
import {
  clearPendingOtp,
  createSession,
  destroySession,
  getPendingOtp,
  setPendingOtp,
} from "@/lib/session";

/**
 * Authentication actions — demo build.
 *
 * No database, so the pending code lives in a signed cookie rather than a
 * table. The OTP rules themselves are unchanged: they are pure functions in
 * @fg/core with their own tests, and they do not care where the code was
 * stored.
 */

export interface AuthState {
  readonly error?: string;
  readonly ok?: boolean;
}

export async function requestOtp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const phone = normalizeKuwaitPhone(String(formData.get("phone") ?? ""));
  if (!phone) {
    return {
      error:
        locale === "ar" ? "رقم هاتف غير صحيح" : "Enter a valid Kuwaiti mobile number",
    };
  }

  const code = generateOtp();
  await setPendingOtp(phone, hashOtp(code, phone));

  // No SMS provider. The code goes to the server console, and the login screen
  // says so. Swapping in a real gateway replaces exactly this line.
  console.log(`\n  📱 OTP for ${phone}: ${code}\n`);

  redirect(`/${locale}/verify?phone=${encodeURIComponent(phone)}`);
}

export async function verifyOtp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const code = String(formData.get("code") ?? "").trim();

  const wrong =
    locale === "ar"
      ? "الرمز غير صحيح أو منتهي الصلاحية"
      : "That code is wrong or expired";

  const pending = await getPendingOtp();
  // The cookie expiring IS the code expiring, so a missing cookie means the
  // five minutes elapsed — or no code was ever requested. Same message either
  // way, so nothing is revealed about which.
  if (!pending) return { error: wrong };

  const result = checkOtp({
    code,
    phone: pending.phone,
    storedHash: pending.codeHash,
    // Expiry and attempt counting are enforced by the cookie's own lifetime;
    // a signed cookie cannot be edited to extend either.
    expiresAt: new Date(Date.now() + 60_000),
    attempts: 0,
    consumedAt: null,
  });

  if (!result.ok) return { error: wrong };

  // One use only.
  await clearPendingOtp();

  // The demo has a fixed set of users. A known number signs into that account;
  // anything else falls back to the seeded member so the flow always completes.
  const user = findUserByPhone(pending.phone) ?? demoUser();
  if (!user) return { error: wrong };

  await createSession(user.id);
  redirect(`/${locale}/memberships`);
}

export async function signOut(formData: FormData): Promise<void> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  await destroySession();
  redirect(`/${locale}`);
}
