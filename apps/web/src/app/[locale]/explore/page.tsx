import { permanentRedirect } from "next/navigation";
import { DEFAULT_LOCALE, isLocale } from "@fg/i18n";

/**
 * The gyms list moved to /gyms when the site grew to ten sections — "explore"
 * no longer says which of them you are exploring.
 *
 * Kept as a permanent redirect rather than deleted: the old path is in Emad's
 * browser history, in links already sent, and in anything that indexed it.
 * Query strings are preserved so a shared search still lands on its results.
 */
export default async function ExploreRedirect({
  params,
  searchParams,
}: PageProps<"/[locale]/explore">) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
  }
  const suffix = qs.size > 0 ? `?${qs}` : "";

  permanentRedirect(`/${locale}/gyms${suffix}`);
}
