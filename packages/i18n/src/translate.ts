import type { Dictionary } from "./dictionary";
import { ar } from "./locales/ar";
import { en } from "./locales/en";
import type { Locale } from "./types";

// An object keyed by locale. `as const` again, so the keys stay the exact
// literals "ar" and "en" — that is what lets `DICTIONARIES[locale]` type-check
// below without any cast.
const DICTIONARIES = { ar, en } as const;

/**
 * Every valid key path in the dictionary, as a union type:
 *   "common.search" | "gym.verified" | "checkout.total" | ...
 *
 * This is a recursive mapped type — the most advanced TypeScript in the
 * codebase — and it buys something real. `t("gym.verifed")` becomes a compile
 * error instead of a blank label a user discovers in production. Autocomplete
 * works on it too, so you never have to go and read the dictionary.
 *
 * Read it as: for each key K, if the value is a string the path is just K;
 * otherwise recurse into the object and join with a dot.
 */
// ═══════════════════════════════════════════════════════════════════════════
// DO NOT WORRY IF THIS ONE TAKES A WHILE. It is genuinely advanced, it is the
// hardest type in the repo, and you can use `t()` perfectly well without ever
// understanding how it is built. Come back to it later.
//
// Here is the line broken into its four pieces:
//
//   type NestedKey<T> = {
//     [K in keyof T & string]:  ①
//       T[K] extends string     ②
//         ? K                   ③
//         : `${K}.${NestedKey<T[K]>}`   ④
//   }[keyof T & string];        ⑤
//
// ① `[K in keyof T & string]` is a MAPPED TYPE — a loop over types, roughly
//    "for each key K of T". `keyof T` gives the union of T's keys. The
//    `& string` filters out symbol and number keys, so K is always text
//    (template literals in ④ require that).
//
// ② `T[K] extends string ? A : B` is a CONDITIONAL TYPE — an if/else that
//    runs in the type system. It asks: is the value at this key a string?
//
// ③ If yes, this key is a leaf. The path is just the key: "search".
//
// ④ If no, the value is a nested object, so recurse. NestedKey<T[K]> works
//    out the paths INSIDE it, and the TEMPLATE LITERAL TYPE `${K}.${...}`
//    glues them together with a dot — exactly like a template string, but
//    producing types rather than values. Given { common: { search: "..." } },
//    K is "common", the recursion yields "search", and the result is
//    "common.search".
//
// ⑤ Steps ①–④ build an OBJECT whose values are the path strings. The final
//    `[keyof T & string]` indexes into that object with every key at once,
//    which collapses it into a union of all the values — the list of paths.
//    Without this last step you would have an object type, not a union.
//
// The whole thing runs at compile time and produces zero JavaScript.
type NestedKey<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${NestedKey<T[K]>}`;
}[keyof T & string];

// Applied to the Arabic dictionary specifically. Arabic is the source of
// truth: a key that exists only in English is not a valid TranslationKey and
// will not compile at the call site.
export type TranslationKey = NestedKey<typeof ar>;

/**
 * Walks the dotted path at runtime.
 *
 * Note that we still have to check the result. TypeScript's types are erased
 * when it compiles to JavaScript, so the compile-time guarantee above buys us
 * nothing in here. That gap between compile time and runtime is the biggest
 * adjustment coming from C#, where the type system is enforced at both.
 */
function lookup(dict: Dictionary, key: string): string {
  // Turn "gym.verified" into ["gym", "verified"], then walk the object one
  // level per step. `.reduce` starts from `dict` and replaces the accumulator
  // with the next level down each time.
  //
  // `.reduce<unknown>(...)` passes an explicit generic argument, telling
  // TypeScript the accumulator's type is `unknown` rather than inferring it
  // from `dict`. `unknown` is the honest type here: at each step we genuinely
  // do not know whether we have an object or a string yet.
  //
  // `?.[part]` is OPTIONAL CHAINING with a computed key. If the left side is
  // null or undefined, the whole expression short-circuits to `undefined`
  // instead of throwing "cannot read property of undefined". That is what
  // makes a wrong path fail softly and land on the check below.
  //
  // `unknown` vs `any`: both mean "could be anything", but `unknown` forbids
  // you from using the value until you have narrowed it, whereas `any`
  // switches type-checking off entirely. Prefer `unknown` — it is the safe one.
  const value = key
    .split(".")
    .reduce<unknown>(
      (acc, part) => (acc as Record<string, unknown> | undefined)?.[part],
      dict,
    );

  // `typeof value !== "string"` is the RUNTIME typeof — the JavaScript
  // operator, not the type-level one used in types.ts. It also narrows: after
  // this check, TypeScript knows `value` is a string on the final line.
  if (typeof value !== "string") {
    // Loud in development, harmless in production: never show a user a blank.
    //
    // `process.env` holds environment variables. NODE_ENV is set to
    // "development" by `next dev` and "production" by `next build`, so this
    // branch is how a mistake becomes a crash you cannot miss while working,
    // and a degraded-but-alive page for a real user.
    if (process.env["NODE_ENV"] !== "production") {
      throw new Error("Missing translation: " + key);
    }
    // Returning the key itself shows "gym.verified" on screen — ugly, but it
    // tells you exactly which key is missing. Better than an empty space.
    return key;
  }
  return value;
}

// ── A function that returns a function ──
//
// `createTranslator("ar")` hands back a NEW function that has the Arabic
// dictionary baked into it. The returned function closes over `dict` — that
// captured variable is called a CLOSURE, and it survives after
// createTranslator has finished running.
//
// This is why components do `const t = createTranslator(locale)` once at the
// top and then call `t("...")` freely: the locale is fixed, so no call site
// has to keep passing it.
//
// Note there is no return type annotation. TypeScript infers
// `(key: TranslationKey) => string`, which is exactly right, so writing it
// out would only add something to keep in sync.
export function createTranslator(locale: Locale) {
  const dict: Dictionary = DICTIONARIES[locale];
  return (key: TranslationKey): string => lookup(dict, key);
}

// `ReturnType<T>` is a built-in UTILITY TYPE: given a function type, it
// extracts what that function returns. So `Translator` is
// `(key: TranslationKey) => string` — derived rather than hand-written, so it
// cannot fall out of step with the function above.
//
// This is the type used whenever a translator is passed as a prop, e.g.
// `{ t }: { t: Translator }`.
export type Translator = ReturnType<typeof createTranslator>;
