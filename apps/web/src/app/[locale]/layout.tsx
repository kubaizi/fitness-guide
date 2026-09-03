import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALES,
  createTranslator,
  directionOf,
  isLocale,
} from "@fg/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { arabicKufi } from "@/fonts";
// Importing a CSS file for its side effect. There is nothing to destructure —
// the import tells the bundler to include this stylesheet. Because it happens
// in the root layout, these styles apply to every page in the app.
import "../globals.css";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * START HERE if you are new to Next.js. This file is the root of every page.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── The App Router, in one paragraph ──
 * Next.js turns FOLDERS into URLs. A folder under `src/app/` is a path
 * segment, and specially-named files inside it do specific jobs:
 *
 *   page.tsx     the page rendered at that URL
 *   layout.tsx   a wrapper around that page AND everything nested below it
 *   loading.tsx  shown while the page is being prepared
 *
 * A folder in [square brackets] is a DYNAMIC segment — it matches anything
 * and passes the matched text in as a parameter. So this file lives at
 * `app/[locale]/layout.tsx` and wraps every URL of the form `/ar/...`,
 * `/en/...`, with `locale` set to "ar" or "en".
 *
 * ── Server Components ──
 * Every component in this app runs on the SERVER unless its file starts with
 * `"use client"`. This one has no such line, so it is a Server Component:
 *
 *   • It can be `async` and `await` data directly — no useEffect, no fetch
 *     from the browser, no loading spinner.
 *   • Its code is NEVER sent to the browser. The browser receives finished HTML.
 *   • It cannot use hooks (useState, useEffect) or event handlers (onClick),
 *     because there is no browser there to run them.
 *
 * When a component genuinely needs interactivity, it opts in with
 * `"use client"` — see src/components/MobileMenu.tsx for the contrast.
 *
 * ── JSX ──
 * The HTML-looking syntax in `return` below is JSX. It is not HTML and not a
 * string; it compiles to function calls that build a description of the UI.
 * Two differences that catch everyone out:
 *   • `className`, not `class` (because `class` is a reserved word)
 *   • `{expression}` drops a JavaScript value into the markup
 */

/**
 * This is the ROOT layout, even though it lives inside `[locale]`.
 *
 * Next.js allows the root layout to be nested under a dynamic segment, which
 * is what makes `lang` and `dir` available on the <html> element itself. That
 * single `dir` attribute is most of RTL support — every CSS logical property
 * in the app mirrors off it.
 */

// ── `generateStaticParams` — a Next.js special export ──
// Tells Next which values of `[locale]` exist, so it can build those pages
// ahead of time (at BUILD time) rather than on each request. Returning
// `[{ locale: "ar" }, { locale: "en" }]` means both language trees are
// pre-rendered into static HTML and served instantly.
//
// The name and shape are fixed by Next.js — it looks for this exact export.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// ── `generateMetadata` — another Next.js special export ──
// Produces the contents of <head>: the browser-tab title, the description
// used by search engines and link previews. It is async because the title
// depends on the locale, which arrives as a promise.
//
// Note there is no <head> element written by hand anywhere in this app. Next
// assembles it from what this function returns.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Falls back to the default locale rather than 404ing. Metadata is
  // generated even for a URL that will fail below, and a crash here would
  // produce a confusing error instead of the intended 404 page.
  const active = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const t = createTranslator(active);

  return {
    title: t("common.appName"),
    description: t("home.subtitle"),
  };
}

// ── `export default` ──
// Next.js identifies the layout by it being the file's DEFAULT export, not by
// the function's name. `RootLayout` is a label for humans; renaming it
// changes nothing. Every page.tsx and layout.tsx in this app follows the
// same rule.
export default async function RootLayout({
  children,
  params,
}: {
  // `children` is the special prop React uses for nested content. Whatever
  // this layout wraps — the page, and any deeper layouts — arrives here.
  // `React.ReactNode` is the type for "anything renderable": an element, a
  // string, a number, an array of those, or null.
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // `params` is a Promise in Next 15+. Awaiting it is not optional.
  //
  // This is a recent breaking change and a very common source of confusion:
  // most tutorials online show `params.locale` used directly. In this version
  // that yields a Promise, not a string, and the page breaks.
  const { locale } = await params;

  // An unknown locale is a 404, not a silent fallback — otherwise /fr/gyms
  // would quietly render Arabic and nobody would notice the broken link.
  //
  // This is also the NARROWING step: `locale` is typed `string` above, and
  // `isLocale` is a type predicate (see packages/i18n/src/types.ts), so after
  // this line TypeScript treats it as `Locale`. That is what lets it be
  // passed to `directionOf` and `SiteHeader` below without a cast.
  if (!isLocale(locale)) notFound();

  return (
    // This app writes its own <html> and <body>. That is unique to the root
    // layout — no other component in the codebase does, or may.
    //
    //   lang={locale}            tells screen readers and browsers which
    //                            language this is, which affects pronunciation
    //                            and hyphenation.
    //   dir={directionOf(locale)} "rtl" for Arabic, "ltr" for English. This
    //                            one attribute mirrors the entire layout —
    //                            see packages/i18n/src/direction.ts.
    //   className={arabicKufi.variable}
    //                            puts the generated font class on <html>, so
    //                            the --font-arabic-kufi CSS variable is
    //                            available everywhere. See src/fonts.ts.
    <html lang={locale} dir={directionOf(locale)} className={arabicKufi.variable}>
      <body>
        {/* Rendered on every page, because it is in the layout rather than in
            any individual page. */}
        <SiteHeader locale={locale} />
        {/* Where the actual page goes. Everything nested under /[locale]/
            renders here, inside the header and the <body>. */}
        {children}
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
