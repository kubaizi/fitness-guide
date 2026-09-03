import type { Locale } from "./types";

/**
 * Kuwait has no daylight saving, so a fixed zone is safe. Store every timestamp
 * in UTC and convert only at display time.
 */
// Why the timezone must be stated explicitly: without `timeZone`, Intl uses
// whatever zone the machine is set to. On Vercel that is UTC, on your laptop
// it is Kuwait — so a check-in recorded at 6am would render as 3am in
// production and nobody would reproduce it locally. Pinning the zone removes
// a whole category of "works on my machine" bug.
const KUWAIT_TZ = "Asia/Kuwait";

/**
 * Numerals: Kuwaiti apps overwhelmingly use Western digits (1234) even in Arabic
 * UI, rather than Arabic-Indic. The `-u-nu-latn` suffix forces that. If your
 * brother prefers Arabic-Indic, change it here and nowhere else.
 */
// The same tag logic appears in @fg/core's money.ts. Duplicated deliberately:
// core must not depend on i18n, and one shared constant across package
// boundaries would couple them for the sake of one short string.
const localeTag = (locale: Locale): string =>
  locale === "ar" ? "ar-KW-u-nu-latn" : "en-KW";

// `iso` is a date as text, e.g. "2026-08-23T06:15:00Z" — the format JSON
// carries dates in, since JSON has no date type of its own.
//
// `new Date(iso)` parses it into a JavaScript Date, which internally is just
// a count of milliseconds since 1970 in UTC. All the locale and timezone
// work happens in the formatter, not in the Date.
export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    // `dateStyle: "medium"` asks for the locale's own idea of a medium-length
    // date — "23 Aug 2026" in English. Naming a style rather than hand-writing
    // a pattern like "dd/MM/yyyy" is what keeps each language idiomatic.
    dateStyle: "medium",
    timeZone: KUWAIT_TZ,
  }).format(new Date(iso));
}

export function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeStyle: "short", // "6:15 AM"
    timeZone: KUWAIT_TZ,
  }).format(new Date(iso));
}

// Handles digit grouping per locale — 1234567 becomes "1,234,567". Not every
// locale groups in threes or uses a comma, which is the reason to route even
// plain numbers through Intl rather than through string concatenation.
export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale)).format(n);
}
