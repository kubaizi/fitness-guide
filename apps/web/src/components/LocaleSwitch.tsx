// A client component only because it needs `usePathname` — a hook, and hooks
// require the client. There is no state and no event handler here otherwise.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, type Locale } from "@fg/i18n";
import styles from "./LocaleSwitch.module.css";

// Each language named IN ITSELF — "العربية", not "Arabic". Someone who only
// reads Arabic must be able to find the Arabic option, so translating these
// labels would defeat the purpose.
//
// `Record<Locale, string>` requires an entry for every locale — add a third
// language and this stops compiling until its label is supplied.
const LABEL: Record<Locale, string> = { ar: "العربية", en: "English" };

/**
 * Swaps the locale segment of the current path, so switching language keeps
 * you on the same page rather than dumping you back at the home screen.
 *
 * A plain <Link> rather than a client-side state toggle: the whole document
 * direction changes, so a full navigation is the honest way to do it.
 */
export function LocaleSwitch({ current }: { current: Locale }) {
  const pathname = usePathname();

  const swap = (target: Locale) => {
    // "/ar/gyms/iron-club".split("/") → ["", "ar", "gyms", "iron-club"]
    const segments = pathname.split("/");
    // segments[0] is "" because the path starts with a slash.
    // So index 1 is the locale — replace it and leave the rest of the path
    // untouched, which is what keeps you on the same page.
    segments[1] = target;
    // `.join("/")` rebuilds the path. The `|| \`/${target}\`` is a fallback
    // for the pathological case of an empty result, which would otherwise
    // produce an empty href.
    return segments.join("/") || `/${target}`;
  };

  return (
    <div className={styles.group}>
      {/* Mapping over LOCALES rather than hardcoding two links. Adding a
          third language needs no change here at all. */}
      {LOCALES.map((loc) => (
        <Link
          key={loc}
          href={swap(loc)}
          className={loc === current ? styles.active : styles.option}
          aria-current={loc === current ? "true" : undefined}
          // `lang` on the link itself, so a screen reader pronounces "العربية"
          // with an Arabic voice even while reading an English page.
          lang={loc}
        >
          {LABEL[loc]}
        </Link>
      ))}
    </div>
  );
}
