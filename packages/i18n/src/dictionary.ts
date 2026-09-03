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
// ── The problem in concrete terms ──
//
// After `as const`, the Arabic dictionary's type is literally:
//
//   { common: { search: "بحث" } }        ← the value IS the type
//
// English says `{ common: { search: "Search" } }`. "Search" is not assignable
// to the type `"بحث"`, so English would fail to type-check against Arabic —
// even though it is perfectly correct.
//
// ── What DeepShape does about it ──
//
// It walks the structure and replaces each string leaf with the general type
// `string`, turning the above into:
//
//   { common: { search: string } }        ← structure kept, value freed
//
// The mechanics are the same two features used in translate.ts: a MAPPED TYPE
// (`[K in keyof T]`, a loop over keys) plus a CONDITIONAL TYPE
// (`T[K] extends string ? A : B`, an if/else). The recursion into
// `DeepShape<T[K]>` is what makes it work at any nesting depth.
//
// Compare with `NestedKey` in translate.ts: that one collapses the object
// into a union of dotted paths; this one preserves the object and only
// loosens the leaves. Same tools, different goals.
export type DeepShape<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepShape<T[K]>;
};

/** The structural contract every locale must satisfy. Arabic defines it. */
// The practical effect: `en.ts` is annotated `: Dictionary`, so forgetting to
// translate a key is a build error naming the missing key — not a blank space
// somebody notices in production. Arabic being the source of truth is a
// deliberate choice for a Kuwaiti market, not an accident.
export type Dictionary = DeepShape<typeof ar>;
