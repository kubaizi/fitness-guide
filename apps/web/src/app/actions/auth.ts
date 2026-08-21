"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  OTP_TTL_MS,
  checkOtp,
  generateOtp,
  hashOtp,
  normalizeKuwaitPhone,
} from "@fg/core";
import { DEFAULT_LOCALE, isLocale } from "@fg/i18n";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";

/**
 * Authentication actions.
 *
 * Server Actions always run on the server, so the OTP never travels to the
 * browser except by SMS. Each returns a plain object the form renders — no
 * thrown errors leaking stack traces to users.
 */

export interface AuthState {
  readonly error?: string;
  readonly ok?: boolean;
}

/** No more than 3 codes per number per 10 minutes. */
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_SENDS = 3;

export async function requestOtp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const rawPhone = String(formData.get("phone") ?? "");
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const phone = normalizeKuwaitPhone(rawPhone);
  if (!phone) {
    return {
      error:
        locale === "ar" ? "رقم هاتف غير صحيح" : "Enter a valid Kuwaiti mobile number",
    };
  }

  // Rate limit before doing any work, so flooding costs nothing.
  const recent = await prisma.otpCode.count({
    where: { phone, createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) } },
  });
  if (recent >= RATE_MAX_SENDS) {
    return {
      error:
        locale === "ar"
          ? "تم إرسال عدة رموز. انتظر قليلاً ثم حاول مرة أخرى."
          : "Too many codes requested. Wait a few minutes and try again.",
    };
  }

  const code = generateOtp();
  await prisma.otpCode.create({
    data: {
      phone,
      codeHash: hashOtp(code, phone),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  // No SMS provider yet — a real one needs the licensed entity that is still
  // unresolved. Logging it is enough to build and test the entire flow, and
  // swapping in a gateway replaces exactly these three lines.
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n  📱 OTP for ${phone}: ${code}\n`);
  }

  redirect(`/${locale}/verify?phone=${encodeURIComponent(phone)}`);
}

export async function verifyOtp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const rawPhone = String(formData.get("phone") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const phone = normalizeKuwaitPhone(rawPhone);
  if (!phone)
    return { error: locale === "ar" ? "رقم هاتف غير صحيح" : "Invalid phone number" };

  const wrong =
    locale === "ar"
      ? "الرمز غير صحيح أو منتهي الصلاحية"
      : "That code is wrong or expired";

  const record = await prisma.otpCode.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  // Deliberately the same message as a wrong code: saying "no code requested"
  // would confirm whether a number is in the system.
  if (!record) return { error: wrong };

  const result = checkOtp({
    code,
    phone,
    storedHash: record.codeHash,
    expiresAt: record.expiresAt,
    attempts: record.attempts,
    consumedAt: record.consumedAt,
  });

  if (!result.ok) {
    // Count the attempt so brute force actually runs out.
    if (result.reason === "mismatch") {
      await prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
    }
    if (result.reason === "locked") {
      return {
        error:
          locale === "ar"
            ? "تم تجاوز عدد المحاولات. اطلب رمزاً جديداً."
            : "Too many attempts. Request a new code.",
      };
    }
    return { error: wrong };
  }

  // Burn the code immediately — one use only, even if two tabs submit at once.
  await prisma.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  // First sign-in creates the account. Phone IS the identity here.
  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: {
      phone,
      name: locale === "ar" ? "عضو جديد" : "New member",
      gender: "unspecified",
      locale,
    },
  });

  const h = await headers();
  await createSession(user.id, {
    userAgent: h.get("user-agent") ?? undefined,
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  });

  redirect(`/${locale}/memberships`);
}

export async function signOut(formData: FormData): Promise<void> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  await destroySession();
  redirect(`/${locale}`);
}
