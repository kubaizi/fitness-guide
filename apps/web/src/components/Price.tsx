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
// ── Why "the only component allowed" is a real rule ──
// money.ts insists prices stay integer fils everywhere. The moment one
// becomes a display string it is no longer safe to do arithmetic on. Funnelling
// every price through this one component means there is exactly one place
// where that conversion happens — the edge of the app, at render time.
//
// ── The bidi problem, if it is unfamiliar ──
// In an RTL paragraph, the browser reorders runs of text by script. A price
// like "KWD 12.500" is Latin and digits inside Arabic, and without an
// explicit isolation the symbol can be flung to the wrong end, producing
// "12.500 KWD" reversed or worse. The `ltr` class pins it.
export function Price({
  // Typed `Fils`, not `number`. A caller cannot pass a raw number — see the
  // branded type in packages/core/src/money.ts — so an unconverted value
  // cannot reach the screen by accident.
  amount,
  locale,
  // Three optional props with defaults, which is what makes this component
  // reusable across the card, the plan list and the checkout summary.
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
  // ── The array → filter → join idiom for conditional classes ──
  //
  //   1. Build an array, using "" for classes that should not apply.
  //   2. `.filter(Boolean)` drops every falsy entry (here, the empty strings).
  //      `Boolean` is being passed as the callback — `.filter(Boolean)` is
  //      shorthand for `.filter(x => Boolean(x))`.
  //   3. `.join(" ")` glues the survivors into one space-separated string.
  //
  // Without the filter you would get doubled spaces like "price  md", which
  // works but is untidy in the DOM. Larger codebases usually reach for the
  // `clsx` library for this; with four classes it is not worth a dependency.
  const cls = [
    styles.price,
    styles[size],
    muted ? styles.muted : "",
    strike ? styles.strike : "",
  ]
    .filter(Boolean)
    .join(" ");

  // `ltr` has no `styles.` prefix — it is a GLOBAL class from globals.css,
  // not a scoped CSS-module one. Both kinds can sit in the same className.
  return <span className={`${cls} ltr`}>{formatKwd(amount, locale)}</span>;
}
