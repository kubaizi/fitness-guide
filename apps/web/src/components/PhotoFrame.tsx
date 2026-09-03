import styles from "./PhotoFrame.module.css";

/**
 * Stands in for gym photography until real images exist.
 *
 * Deliberately a designed placeholder rather than a grey box: gym photos are
 * the product, and an empty rectangle would make the whole screen read as
 * unfinished when the layout around it is not.
 */
export function PhotoFrame({
  // `seed` is the gym's id. Used only to pick a colour — see below.
  seed,
  label,
  tall = false,
}: {
  seed: string;
  label: string;
  tall?: boolean;
}) {
  // Stable pseudo-random hue offset so each gym looks distinct but consistent.
  //
  // ── How this one line works ──
  //   [...seed]          spreads the string into an array of characters.
  //                      "ab" becomes ["a", "b"].
  //   .reduce(...)       sums the character codes: "a"=97, "b"=98 → 195.
  //   % 40               wraps the total into the range 0–39.
  //
  // "Pseudo-random" is the key word: it is not random at all. The same gym id
  // always produces the same number, so a gym's placeholder colour never
  // changes between renders or between server and browser.
  //
  // That determinism matters. `Math.random()` here would produce a different
  // colour on the server than in the browser, and React would report a
  // HYDRATION MISMATCH — the error you get when the server's HTML and the
  // browser's first render disagree.
  const shift = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % 40;

  return (
    <div
      className={`${styles.frame} ${tall ? styles.tall : ""}`}
      // ── Inline styles in React ──
      // `style` takes an OBJECT, not a string: `{{ color: "red" }}`. The outer
      // braces enter JavaScript, the inner ones are the object literal — which
      // is why inline styles always look doubly-braced.
      //
      // The computed key `["--shift" as string]` sets a CSS CUSTOM PROPERTY.
      // The `as string` cast is needed because React's style type only knows
      // about standard CSS properties and does not include arbitrary `--x`
      // names.
      //
      // Passing the value through CSS rather than computing a colour here
      // keeps the palette decision in the stylesheet: PhotoFrame.module.css
      // reads `--shift` inside an `hsl()`.
      style={{ ["--shift" as string]: `${shift}deg` }}
      // `role="img"` plus `aria-label` makes this decorative div announce
      // itself to a screen reader as a single image named after the gym,
      // rather than as a stray letter floating in the layout.
      role="img"
      aria-label={label}
    >
      {/* The gym's first letter as a monogram. `.trim()` first, so a name
          with a leading space does not render a blank. */}
      <span className={styles.mark}>{label.trim().charAt(0)}</span>
    </div>
  );
}
