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
import { arabicKufi } from "@/fonts";
import "../globals.css";

/**
 * This is the ROOT layout, even though it lives inside `[locale]`.
 *
 * Next.js allows the root layout to be nested under a dynamic segment, which
 * is what makes `lang` and `dir` available on the <html> element itself. That
 * single `dir` attribute is most of RTL support — every CSS logical property
 * in the app mirrors off it.
 */

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const active = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const t = createTranslator(active);

  return {
    title: t("common.appName"),
    description: t("home.subtitle"),
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // `params` is a Promise in Next 15+. Awaiting it is not optional.
  const { locale } = await params;

  // An unknown locale is a 404, not a silent fallback — otherwise /fr/gyms
  // would quietly render Arabic and nobody would notice the broken link.
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} dir={directionOf(locale)} className={arabicKufi.variable}>
      <body>
        <SiteHeader locale={locale} />
        {children}
      </body>
    </html>
  );
}
