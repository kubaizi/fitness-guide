import { formatKwd } from "@fg/core";
import type { Fils } from "@fg/core";
import type { Locale } from "@fg/i18n";
import styles from "./Price.module.css";

/**
 * The only component allowed to turn fils into a decimal string.
 *
 * Note `.ltr` — prices contain digits and a currency symbol, and Arabic bidi
 * reordering mangles them without an explicit isolation.
 */
export function Price({
  amount,
  locale,
  size = "md",
  muted = false,
  strike = false,
}: {
  amount: Fils;
  locale: Locale;
  size?: "sm" | "md" | "lg";
  muted?: boolean;
  strike?: boolean;
}) {
  const cls = [
    styles.price,
    styles[size],
    muted ? styles.muted : "",
    strike ? styles.strike : "",
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={`${cls} ltr`}>{formatKwd(amount, locale)}</span>;
}
