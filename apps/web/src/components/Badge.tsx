import styles from "./Badge.module.css";

/**
 * A small coloured pill — "Verified", "Active", "Expired".
 *
 * The simplest component in the codebase, and a good one to read first.
 */

// Not exported. This type is an implementation detail: callers pass the
// string "ok" directly and TypeScript checks it against the union.
type Tone = "ok" | "warn" | "neutral";

export function Badge({
  // `tone = "neutral"` gives the prop a DEFAULT. Because destructuring
  // happens in the parameter list, defaults work exactly as they do for
  // ordinary function arguments.
  tone = "neutral",
  children,
}: {
  // The `?` marks the prop optional — required, since it has a default.
  tone?: Tone;
  // `children` is React's special prop for whatever sits between the tags:
  //
  //   <Badge tone="ok">Verified</Badge>
  //                    ^^^^^^^^ this is children
  //
  // Any component that accepts `children` can wrap arbitrary content.
  children: React.ReactNode;
}) {
  // ── Combining class names with a template literal ──
  // `styles.badge` is the shared styling; `styles[tone]` picks the colour by
  // looking the tone up in the CSS module's exported object. So tone="ok"
  // reads `styles.ok`, i.e. the `.ok` class in Badge.module.css.
  //
  // Indexing an object with a variable like this is fine in TypeScript
  // precisely because `Tone` is a union of three known strings — it can check
  // that all three exist on `styles`.
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
