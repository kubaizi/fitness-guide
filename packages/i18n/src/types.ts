/**
 * ═══════════════════════════════════════════════════════════════════════════
 * The two languages this app speaks, and how the type is derived from them.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Why `as const` matters enormously here ──
//
// Without it, TypeScript infers the type `string[]` — "an array of strings",
// contents unknown and mutable.
//
// With `as const`, it infers `readonly ["ar", "en"]` — a frozen tuple of two
// exact string literals. That precision is what makes the next declaration
// possible.
export const LOCALES = ["ar", "en"] as const;

/** "ar" | "en" - derived from the array, so the two can never drift apart. */
// ── Reading `(typeof LOCALES)[number]` ──
//
// `typeof LOCALES` in TYPE position means "the type of that value", which is
// `readonly ["ar", "en"]`. (Confusingly, `typeof` in normal code is the
// unrelated JavaScript operator that returns "string", "number" etc. Same
// keyword, two different worlds — you can tell them apart by whether you are
// writing a type or an expression.)
//
// `[number]` then INDEXES that tuple type with `number`, meaning "the type of
// whatever you get by reading any numeric index". Element 0 is "ar", element 1
// is "en", so the answer is the union `"ar" | "en"`.
//
// The payoff: add "fr" to the LOCALES array and this type widens by itself.
// There is no second list to remember to update — the classic bug this avoids
// is a language added in one place and forgotten in the other.
export type Locale = (typeof LOCALES)[number];

/** Arabic first: the market is Kuwait, and RTL is far cheaper to build than to retrofit. */
export const DEFAULT_LOCALE: Locale = "ar";

// ── A TYPE PREDICATE — one of TypeScript's most useful features ──
//
// Look at the return type: `value is Locale`, not `boolean`. It still returns
// a boolean at runtime, but it also tells the compiler something extra:
// "if this returned true, the argument really is a Locale".
//
// That is what makes this pattern work in the page files:
//
//   const raw: string = params.locale;   // just a string, could be anything
//   if (!isLocale(raw)) notFound();
//   // ↓ from here on TypeScript treats `raw` as Locale, not string
//   const t = createTranslator(raw);
//
// Without the predicate, `isLocale` would return a plain boolean and you
// would still have to cast. This is the narrowing tool for values arriving
// from outside the program — URLs, form fields, JSON — where the compiler has
// no way to know the shape on its own.
//
// The cast `(LOCALES as readonly string[])` is needed because `.includes()`
// on a `readonly ["ar","en"]` insists its argument already be "ar" | "en" —
// which would defeat the entire purpose. Widening to `readonly string[]`
// lets any string be tested.
export const isLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);
