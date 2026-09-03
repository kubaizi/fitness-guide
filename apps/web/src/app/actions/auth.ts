// ═══════════════════════════════════════════════════════════════════════════
// `"use server"` — SERVER ACTIONS. One of the most important ideas in modern
// Next.js, and the piece with no equivalent in older React tutorials.
//
// This directive marks every exported function in the file as a Server
// Action. Such a function:
//
//   • always runs on the SERVER, never in the browser
//   • can be handed straight to a <form action={...}> in a Client Component
//   • is called by Next.js generating an HTTP POST behind the scenes
//
// The point: no API route to write, no `fetch("/api/login")`, no JSON to
// serialise by hand. You write a function, you attach it to a form, and Next
// wires up the network call. See src/components/LoginForm.tsx for the form side.
//
// ── The security consequence you MUST internalise ──
// A Server Action is a PUBLIC HTTP ENDPOINT. Anyone can post to it with curl,
// with any payload, without ever loading your form. So:
//
//   • Never trust the incoming FormData.
//   • Re-check permission INSIDE the action, even if the page already did.
//     The page's check protected the view; only this one protects the write.
//
// src/app/actions/gym.ts calls `requireGymAccess` for exactly this reason.
// ═══════════════════════════════════════════════════════════════════════════
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

// What the action returns to the form, and therefore what the form can
// display. Both fields are optional (`?`), so `{}` is a valid initial state
// meaning "nothing has happened yet".
export interface AuthState {
  readonly error?: string;
  /** Set when the credentials were right but the door was wrong. */
  readonly wrongDoor?: Door;
}

// ── The `(prevState, formData)` signature ──
// This exact shape is required by React's `useActionState` hook, which is how
// LoginForm.tsx connects to this function. React supplies:
//
//   _prev     whatever this action returned last time
//   formData  the submitted form
//
// The leading underscore in `_prev` is a convention for "required by the
// signature, deliberately unused" — it also stops the linter complaining.
export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  // ── FormData ──
  // The browser's own representation of a submitted form. `.get(name)`
  // returns the value of the input with that `name` attribute, or null if it
  // is absent.
  //
  // `String(... ?? "")` is defensive on two fronts: `.get` can return null,
  // and it can return a File rather than a string. Every field is coerced to
  // a string before use, because all of this arrives from outside.
  const rawLocale = String(formData.get("locale") ?? "");
  // Never trusted directly — validated, with a fallback.
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = createTranslator(locale);

  const rawDoor = String(formData.get("door") ?? "");
  // An ALLOWLIST rather than a cast: anything that is not exactly "partner"
  // becomes "member", the less privileged of the two. A cast like
  // `rawDoor as Door` would let arbitrary text through with no complaint.
  const door: Door = rawDoor === "partner" ? "partner" : "member";

  const identifier = String(formData.get("identifier") ?? "").trim();
  // Note: no `.trim()` on the password. A trailing space might be deliberate,
  // and silently stripping characters from a password is its own bug.
  const password = String(formData.get("password") ?? "");

  // Deliberately one message for every credential failure. Saying "no such
  // user" would let anyone probe which usernames and phone numbers exist.
  //
  // This is USER ENUMERATION, and the defence is to make "no such account"
  // and "wrong password" indistinguishable from outside.
  const failed = t("auth.failed");

  if (identifier === "" || password === "") return { error: failed };

  // Try the identifier as typed, then as a normalised phone number.
  // So "51338855" is found even though the stored value is "+96551338855".
  const asPhone = normalizeKuwaitPhone(identifier);
  const user =
    findUserForLogin(identifier) ?? (asPhone ? findUserForLogin(asPhone) : null);

  if (!user) return { error: failed };

  // `ok` here is a local boolean, unrelated to the `ok()` helper in
  // @fg/core's Result type.
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
      // Returned so the form can emphasise the link to the other door — see
      // the `state.wrongDoor` check at the bottom of LoginForm.tsx.
      wrongDoor: doorFor(user.role),
    };
  }

  // Everything checked out. Set the signed cookie — see lib/session.ts.
  await createSession(user.id);

  // findUserById returns the public shape landingFor expects — no hash in it.
  // A small deliberate step: `user` at this point is the StoredUser including
  // the password hash, and it must not be passed around casually.
  const signedIn = findUserById(user.id);
  // `redirect` throws, so nothing after this line runs — which is why this
  // function has no final `return` despite promising an AuthState. A
  // successful sign-in leaves via the redirect, never via a return value.
  redirect(signedIn ? landingFor(signedIn, locale) : `/${locale}`);
}

// A simpler action: one argument, not the `(prev, formData)` pair, because it
// is used with a plain `<form action={signOut}>` rather than through
// `useActionState`. Both styles are valid; the two-argument form exists to
// return state back to the form, which sign-out has no need to do.
export async function signOut(formData: FormData): Promise<void> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  await destroySession();
  redirect(`/${locale}`);
}
