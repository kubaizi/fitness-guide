/**
 * A discriminated union for operations that can fail.
 *
 * Coming from C# you would reach for exceptions or a Result<T> class. TypeScript
 * does something C# cannot: the `ok` field narrows the type. After `if (r.ok)`
 * the compiler KNOWS `r.value` exists and `r.error` does not. That is narrowing,
 * and it is the feature you will miss most when you go back to C#.
 */
export type Result<T, E = string> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Throws if the result failed. Use only where failure is genuinely impossible. */
export function unwrap<T, E>(r: Result<T, E>): T {
  if (r.ok) return r.value;
  throw new Error("Tried to unwrap a failed Result: " + String(r.error));
}
