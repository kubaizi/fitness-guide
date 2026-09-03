/**
 * The public front door of the `@fg/i18n` package — a barrel file. See
 * packages/core/src/index.ts for what `export *` does and why barrels exist.
 *
 * Everything below is what the web app can reach via `from "@fg/i18n"`.
 */
export * from "./types"; // Locale, LOCALES, DEFAULT_LOCALE, isLocale
export type { Dictionary } from "./dictionary";
export * from "./direction"; // directionOf, isRtl, mirror
export * from "./format"; // formatDate, formatTime, formatNumber
export * from "./plural"; // pluralForm
export * from "./translate"; // createTranslator, TranslationKey, Translator

// ── Two deliberately different export styles above ──
//
// `export type { Dictionary }` (line 8) exports ONLY the type, and says so.
// The `type` keyword means nothing is emitted into the JavaScript bundle.
// Compare it to `export * from "./dictionary"`, which would also expose
// `DeepShape` — a helper that is an implementation detail of this package and
// has no business being part of its public surface.
//
// Named exports below, rather than `export *`, for the same reason: the
// locale files also export internal helpers that callers should not reach for.
export { ar } from "./locales/ar";
export { en } from "./locales/en";
