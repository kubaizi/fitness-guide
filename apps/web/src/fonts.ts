import localFont from "next/font/local";

/**
 * Droid Arabic Kufi — supplied as a single Regular weight.
 *
 * next/font/local self-hosts the file (no external request, no layout shift)
 * and exposes it as the CSS variable below. It only covers Arabic script —
 * no Latin, no digits — so pairing it with the existing sans stack as a
 * fallback is required, not optional: browsers fall back per-character, so
 * KWD prices and Latin text still render correctly through that fallback.
 */
export const arabicKufi = localFont({
  src: "./fonts/DroidArabicKufi-Regular.ttf",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-arabic-kufi",
});
