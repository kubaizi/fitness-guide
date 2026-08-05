import type { ar } from "./locales/ar";

/**
 * Takes the shape of a dictionary but widens every leaf to `string`.
 *
 * Why this is needed: `ar.ts` ends with `as const`, so TypeScript infers the
 * *literal* type of every value — `"بحث"` rather than `string`. That is what
 * lets us derive exact key paths. But it also means the English dictionary,
 * whose values are ordinary strings, would not be assignable to `typeof ar`.
 *
 * `DeepShape` keeps the structure (so a missing key is still a compile error)
 * while allowing any string value.
 */
export type DeepShape<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepShape<T[K]>;
};

/** The structural contract every locale must satisfy. Arabic defines it. */
export type Dictionary = DeepShape<typeof ar>;
