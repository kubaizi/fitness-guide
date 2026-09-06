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
import { createUser, findUserForLogin, findUserById } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { clearAttempts, recordAttempt, tooManyAttempts } from "@/lib/rate-limit";
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

  // ── Before any real work ──
  // Checked here rather than after the lookup, deliberately. Verifying a
  // password runs scrypt, which is slow ON PURPOSE — that is what makes
  // guessing expensive. It also makes a flood of guesses an easy way to pin
  // the server's CPU. Refusing first means a blocked caller costs one small
  // indexed count instead.
  if (await tooManyAttempts("signin")) {
    return { error: t("auth.tooMany") };
  }

  // Try the identifier as typed, then as a normalised phone number.
  // So "51338855" is found even though the stored value is "+96551338855".
  const asPhone = normalizeKuwaitPhone(identifier);
  const user =
    (await findUserForLogin(identifier)) ??
    (asPhone ? await findUserForLogin(asPhone) : null);

  if (!user) {
    await recordAttempt("signin");
    return { error: failed };
  }

  // `ok` here is a local boolean, unrelated to the `ok()` helper in
  // @fg/core's Result type.
  const ok = verifyPassword(password, {
    salt: user.passwordSalt,
    hash: user.passwordHash,
  });
  if (!ok) {
    await recordAttempt("signin");
    return { error: failed };
  }

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

  // Succeeding wipes the earlier failures, so two mistyped passwords this
  // morning are not still counted against them this afternoon.
  await clearAttempts("signin");

  // findUserById returns the public shape landingFor expects — no hash in it.
  // A small deliberate step: `user` at this point is the StoredUser including
  // the password hash, and it must not be passed around casually.
  const signedIn = await findUserById(user.id);
  // `redirect` throws, so nothing after this line runs — which is why this
  // function has no final `return` despite promising an AuthState. A
  // successful sign-in leaves via the redirect, never via a return value.
  redirect(signedIn ? await landingFor(signedIn, locale) : `/${locale}`);
}

/**
 * What the sign-up form gets back.
 *
 * `field` names which input to point at, so the message lands next to the box
 * that needs fixing rather than floating at the top of a five-field form.
 */
export interface SignUpState {
  readonly error?: string;
  readonly field?: "name" | "username" | "phone" | "password" | "confirm";
  /**
   * Everything except the passwords, echoed back so a rejected form does not
   * come back blank. Losing four correct fields because the fifth was wrong is
   * the fastest way to make someone give up on signing up.
   */
  readonly values?: {
    readonly name: string;
    readonly username: string;
    readonly phone: string;
  };
}

/** How a username has to look: 3–20 of a–z, 0–9 or underscore. */
// Deliberately narrow. A username appears in URLs and gets typed at a sign-in
// box, so letting in spaces, capitals or Arabic script buys nothing and costs
// a class of "I cannot log in" reports. Names in Arabic belong in `name`,
// which has no such rule.
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

/** Shortest password accepted. Long enough to matter, short enough to type. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Creates a member account, signs them in, and sends them to their
 * memberships.
 *
 * Members only. There is no field for a role and the database write hardcodes
 * `member` — see `createUser` in lib/db.ts. Gym accounts are made by hand,
 * because a gym has to be verified before it can sell anything.
 *
 * ── Not yet here, and worth knowing ──
 * There is no rate limit, so nothing stops a script creating a thousand
 * accounts. That needs doing before real advertising points at the site. There
 * is also no way to reset a forgotten password, which is why the form asks for
 * the password twice.
 */
export async function signUp(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = createTranslator(locale);

  const name = String(formData.get("name") ?? "").trim();
  // Lowercased on the way in, so the stored value matches what the sign-in
  // lookup expects and "Emad" cannot become a second account beside "emad".
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const phoneInput = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  // Handed back with every rejection below.
  const values = { name, username, phone: phoneInput };

  // Checked before the validation rules, not after. A script does not care
  // whether its made-up phone number was valid — the point is to stop
  // answering it at all.
  if (await tooManyAttempts("signup")) {
    return { error: t("signup.tooMany"), values };
  }

  // ── Validation, in the order the fields appear on screen ──
  // Guard clauses again, one per rule. The alternative — collecting every
  // error and returning them together — is better for long forms, but it needs
  // an error per field in the state and a lot more markup. Five fields do not
  // earn that yet.
  if (name.length < 2 || name.length > 60) {
    return { error: t("signup.nameInvalid"), field: "name", values };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return { error: t("signup.usernameInvalid"), field: "username", values };
  }

  // Turns "51338855", "+965 5133 8855" and "965-51338855" into one stored
  // form. Returns null when it cannot — see packages/core/src/phone.ts.
  const phone = normalizeKuwaitPhone(phoneInput);
  if (!phone) {
    return { error: t("signup.phoneInvalid"), field: "phone", values };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: t("signup.passwordShort"), field: "password", values };
  }

  if (password !== confirm) {
    return { error: t("signup.passwordMismatch"), field: "confirm", values };
  }

  const outcome = await createUser({ name, username, phone, password, locale });

  if (!outcome.created) {
    // Note this DOES tell the visitor that a username or phone is already in
    // use, which is exactly what the sign-in form refuses to do. The two are
    // different situations: a sign-up form cannot function without saying "that
    // one is taken", and the same fact is discoverable by anyone who tries to
    // register the name anyway. Sign-in stays vague because there it would be
    // pure leakage with no benefit to the person typing.
    return outcome.taken === "phone"
      ? { error: t("signup.phoneTaken"), field: "phone", values }
      : { error: t("signup.usernameTaken"), field: "username", values };
  }

  // Counted only once the account actually exists. A rejected form is usually
  // someone getting the rules wrong, and spending their budget on that would
  // lock out the very person who is trying hardest to join.
  await recordAttempt("signup");

  await createSession(outcome.user.id);
  // Same as sign-in: redirect throws, so nothing after this line runs.
  redirect(await landingFor(outcome.user, locale));
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
