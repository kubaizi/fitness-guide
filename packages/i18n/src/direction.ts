import type { Locale } from "./types";

export type Direction = "rtl" | "ltr";

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
export function mirror(dir: "left" | "right", locale: Locale): "left" | "right" {
  if (!isRtl(locale)) return dir;
  return dir === "left" ? "right" : "left";
}
