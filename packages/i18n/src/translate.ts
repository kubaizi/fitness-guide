import type { Dictionary } from "./dictionary";
import { ar } from "./locales/ar";
import { en } from "./locales/en";
import type { Locale } from "./types";

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
type NestedKey<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${NestedKey<T[K]>}`;
}[keyof T & string];

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
  const value = key
    .split(".")
    .reduce<unknown>(
      (acc, part) => (acc as Record<string, unknown> | undefined)?.[part],
      dict,
    );

  if (typeof value !== "string") {
    // Loud in development, harmless in production: never show a user a blank.
    if (process.env["NODE_ENV"] !== "production") {
      throw new Error("Missing translation: " + key);
    }
    return key;
  }
  return value;
}

export function createTranslator(locale: Locale) {
  const dict: Dictionary = DICTIONARIES[locale];
  return (key: TranslationKey): string => lookup(dict, key);
}

export type Translator = ReturnType<typeof createTranslator>;
