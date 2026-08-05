export const LOCALES = ["ar", "en"] as const;

/** "ar" | "en" - derived from the array, so the two can never drift apart. */
export type Locale = (typeof LOCALES)[number];

/** Arabic first: the market is Kuwait, and RTL is far cheaper to build than to retrofit. */
export const DEFAULT_LOCALE: Locale = "ar";

export const isLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);
