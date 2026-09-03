/**
 * ═══════════════════════════════════════════════════════════════════════════
 * result.ts — representing "this might have failed" in the type system
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * NEW TO TYPESCRIPT? Read this file first. It is short, has no React and no
 * Next.js in it, and it demonstrates the single most important TypeScript
 * idea used throughout this codebase: the DISCRIMINATED UNION.
 *
 * ── What is a "union type"? ──
 * In TypeScript, `A | B` means "either an A or a B". The `|` is read as "or".
 *   let x: string | number;   // x may hold a string OR a number
 *
 * ── What is a "type alias"? ──
 * `type Foo = ...` gives a name to a shape. It is NOT a class. It creates no
 * object and generates no JavaScript — it exists only while the compiler is
 * checking your code, then disappears completely.
 *
 * ── What is `<T>`? ──
 * That is a GENERIC, the same idea as C#'s `List<T>`. It is a placeholder for
 * a type the caller chooses. `Result<Gym, string>` means T = Gym, E = string.
 */

/**
 * A discriminated union for operations that can fail.
 *
 * Coming from C# you would reach for exceptions or a Result<T> class. TypeScript
 * does something C# cannot: the `ok` field narrows the type. After `if (r.ok)`
 * the compiler KNOWS `r.value` exists and `r.error` does not. That is narrowing,
 * and it is the feature you will miss most when you go back to C#.
 */
// ── Reading the syntax below, piece by piece ──
//
//   export        → other files may import this. Without it, the name is
//                   private to this file. (Like `public` in C#.)
//   type          → declaring a type alias, not a class or a variable.
//   Result<T, E = string>
//                 → a generic with TWO placeholders. `E = string` gives E a
//                   DEFAULT, so writing `Result<Gym>` means `Result<Gym, string>`.
//   readonly      → this field cannot be reassigned after the object is made.
//                   Compile-time only; there is no runtime lock.
//   ok: true      → note this is not `boolean`. It is the LITERAL value `true`.
//                   That precision is what makes narrowing work: if `ok` is
//                   `true`, only the first half of the union can match.
export type Result<T, E = string> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

// ── Arrow functions ──
// `const ok = <T>(value: T): Result<T, never> => ({ ... })` is a function
// written in arrow form. Expanded, it says:
//
//   export function ok<T>(value: T): Result<T, never> {
//     return { ok: true, value };
//   }
//
// Three things to notice:
//
// 1. The parentheses around `({ ok: true, value })` are REQUIRED. Without
//    them, JavaScript reads `{` as the start of a function body rather than
//    the start of an object. A very common beginner trip-up.
//
// 2. `{ ok: true, value }` uses shorthand. Writing `value` alone is the same
//    as writing `value: value` — take the parameter named `value` and store
//    it under the key `value`.
//
// 3. `never` is TypeScript's "this can never happen" type. A successful
//    result has no error, so the error type is `never`. It slots into any
//    `Result<T, E>` because `never` is compatible with everything.
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Throws if the result failed. Use only where failure is genuinely impossible. */
// `if (r.ok) return r.value;` is narrowing in action. TypeScript understands
// that inside this `if`, `r` must be the `{ ok: true; value: T }` half of the
// union, so `.value` is legal. On the line after, it knows `r` is the other
// half, so `.error` is legal there instead. Try swapping them and the
// compiler will reject it — no runtime test needed to catch the mistake.
export function unwrap<T, E>(r: Result<T, E>): T {
  if (r.ok) return r.value;
  // `String(r.error)` converts whatever the error is into text. `E` could be
  // anything — an object, a number — so it cannot simply be concatenated.
  throw new Error("Tried to unwrap a failed Result: " + String(r.error));
}
