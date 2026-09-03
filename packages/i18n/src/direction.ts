import type { Locale } from "./types";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Text direction — the part of this app that will be least familiar.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Arabic reads right-to-left (RTL). That is not only about the letters: the
 * whole interface mirrors. Navigation starts on the right, a "back" arrow
 * points right, and what CSS calls `margin-left` is visually on the wrong side.
 *
 * The value produced here ends up on the `<html dir="...">` attribute in
 * app/[locale]/layout.tsx, and the browser mirrors the layout from there.
 */

export type Direction = "rtl" | "ltr";

// Arabic is the only RTL language here, so a direct comparison is honest and
// clear. A lookup table would be premature for two locales.
export const directionOf = (locale: Locale): Direction =>
  locale === "ar" ? "rtl" : "ltr";

export const isRtl = (locale: Locale): boolean => directionOf(locale) === "rtl";

/**
 * Mirrors a physical direction for the current locale.
 *
 * You should almost never need this. CSS logical properties (margin-inline-start,
 * inset-inline-end) and React Native's `start`/`end` mirror for free. Reach for
 * this only where a physical direction is genuinely unavoidable, such as a
 * chevron that has to point "forward".
 */
// ── Worth internalising, because it shapes all the CSS in this repo ──
//
// CSS has two vocabularies for sides:
//
//   PHYSICAL: left / right / margin-left / padding-right
//             Always the same side of the screen, whatever the language.
//
//   LOGICAL:  start / end / margin-inline-start / padding-inline-end
//             "start" means left in LTR and right in RTL — the browser flips
//             them for you when `dir="rtl"` is set.
//
// Write logical properties and Arabic mirrors itself for free. Write physical
// ones and you owe yourself a second stylesheet. That is why this function is
// documented as a last resort rather than a convenience — every call to it is
// a place the automatic mirroring was not enough.
export function mirror(dir: "left" | "right", locale: Locale): "left" | "right" {
  if (!isRtl(locale)) return dir;
  return dir === "left" ? "right" : "left";
}
