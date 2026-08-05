import type { Locale } from "./types";

/**
 * Kuwait has no daylight saving, so a fixed zone is safe. Store every timestamp
 * in UTC and convert only at display time.
 */
const KUWAIT_TZ = "Asia/Kuwait";

/**
 * Numerals: Kuwaiti apps overwhelmingly use Western digits (1234) even in Arabic
 * UI, rather than Arabic-Indic. The `-u-nu-latn` suffix forces that. If your
 * brother prefers Arabic-Indic, change it here and nowhere else.
 */
const localeTag = (locale: Locale): string =>
  locale === "ar" ? "ar-KW-u-nu-latn" : "en-KW";

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "medium",
    timeZone: KUWAIT_TZ,
  }).format(new Date(iso));
}

export function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeStyle: "short",
    timeZone: KUWAIT_TZ,
  }).format(new Date(iso));
}

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale)).format(n);
}
