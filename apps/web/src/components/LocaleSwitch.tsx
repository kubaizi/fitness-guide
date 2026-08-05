"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, type Locale } from "@fg/i18n";
import styles from "./LocaleSwitch.module.css";

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
    const segments = pathname.split("/");
    // segments[0] is "" because the path starts with a slash.
    segments[1] = target;
    return segments.join("/") || `/${target}`;
  };

  return (
    <div className={styles.group}>
      {LOCALES.map((loc) => (
        <Link
          key={loc}
          href={swap(loc)}
          className={loc === current ? styles.active : styles.option}
          aria-current={loc === current ? "true" : undefined}
          lang={loc}
        >
          {LABEL[loc]}
        </Link>
      ))}
    </div>
  );
}
