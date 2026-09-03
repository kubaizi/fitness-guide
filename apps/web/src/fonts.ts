// `next/font/local` is Next.js's font system for font files you ship
// yourself. Its sibling `next/font/google` does the same for Google Fonts.
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
// ── What Next.js actually does with this at build time ──
//
// 1. Copies the .ttf into the build output with a hashed filename.
// 2. Generates the `@font-face` CSS rule for it.
// 3. Hands back an object containing a generated class name and, because
//    `variable` is set, a CSS custom property.
//
// The payoff over a hand-written `@font-face`: the font is served from your
// own domain (no request to a third party, so no extra DNS lookup and no
// privacy question), and Next preloads it, which removes the flash of
// unstyled text you get from a naive font setup.
export const arabicKufi = localFont({
  // Relative to THIS file, so `src/fonts/…`.
  src: "./fonts/DroidArabicKufi-Regular.ttf",
  weight: "400", // 400 is the CSS number for "regular"
  style: "normal",
  // `display: "swap"` shows fallback text immediately and swaps the real font
  // in when it loads. The alternative, "block", leaves text invisible while
  // waiting — worse on a slow Kuwaiti mobile connection.
  display: "swap",
  // Exposes the font as the CSS variable `--font-arabic-kufi` rather than
  // applying it directly. globals.css then decides where it is used, which
  // keeps the font-stack decision in the stylesheet where it belongs.
  //
  // `arabicKufi.variable` is a class name; it is put on <html> in
  // app/[locale]/layout.tsx, which is what makes the variable available to
  // the whole document.
  variable: "--font-arabic-kufi",
});
