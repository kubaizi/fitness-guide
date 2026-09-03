import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@fg/i18n";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * The page at `/` — the bare root, with no language in the URL.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── Do not confuse this file with app/[locale]/page.tsx ──
 *
 *   app/page.tsx           →  /              this file. Redirects, renders nothing.
 *   app/[locale]/page.tsx  →  /ar  or  /en   the real home page.
 *
 * Both are called `page.tsx` because Next.js decides a file's job by its NAME
 * and its URL by its FOLDER. Two pages at two different URLs must therefore
 * have the same filename in different directories. It feels odd at first and
 * then becomes second nature.
 *
 * Every real route in this app lives under `/[locale]/`, so there is nothing
 * to show at `/`. Its only job is to pick a language and forward.
 */

// The bare root has no language in the URL, so there is nothing to render
// here — only to decide where to send someone. A real deployment would read
// the Accept-Language header in `proxy.ts`; this is the honest fallback.
//
// ── Notes on the function itself ──
//
// It is NOT `async`, unlike most pages here, because it awaits nothing.
//
// It has no `return` statement, and TypeScript is content with that:
// `redirect()` throws a special exception that Next.js catches, so the
// function never actually completes. Same mechanism as `notFound()` — see
// src/lib/dal.ts for the fuller explanation.
//
// The result is an HTTP redirect. Someone visiting the site lands on `/ar`
// (DEFAULT_LOCALE is Arabic — the market is Kuwait) and the address bar
// updates to match.
export default function RootRedirect() {
  redirect(`/${DEFAULT_LOCALE}`);
}
