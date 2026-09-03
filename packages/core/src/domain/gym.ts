// `import type` brings in ONLY a type, never runtime code. The compiler
// erases this line entirely when building. Using `import type` (rather than a
// plain `import`) makes that explicit and avoids accidentally pulling a whole
// module into the bundle just to reference one of its types.
//
// `"../money"` is a RELATIVE path: `..` goes up one directory, so this file
// (in src/domain/) reaches src/money.ts. No file extension — the bundler
// resolves `.ts` for you.
import type { Fils } from "../money";

/**
 * Kuwait has six governorates. Modelling this as a union rather than a plain
 * string means a typo is a compile error, not a filter that silently returns
 * nothing at runtime.
 */
// This is a UNION OF STRING LITERALS — the closest TypeScript equivalent to a
// C# enum, but with an important difference: at runtime these really are just
// strings. There is no `Governorate.Capital` object to reference; you write
// the string `"capital"` and the compiler checks it against this list.
//
// The practical benefit is autocomplete plus a compile error on `"capitol"`.
export type Governorate =
  "capital" | "hawalli" | "farwaniya" | "ahmadi" | "jahra" | "mubarak_al_kabeer";

/** Who a gym admits. Drives eligibility, filtering, and which photos may be shown. */
export type GymAccess = "men" | "women" | "mixed" | "separate_sections";

/** What a member can filter by. There is no "separate sections" choice: a
 *  member is looking for somewhere they can train, not for a building
 *  arrangement. */
// Two separate types rather than one shared type, because they answer two
// different questions. `GymAccess` describes the gym; `AccessFilter`
// describes what a member asked for. They overlap but are not the same set —
// and keeping them apart is what makes the mismatch in `admits()` visible.
export type AccessFilter = "men" | "women" | "mixed";

/**
 * Does this gym admit someone searching for `filter`?
 *
 * The one that is easy to get wrong: a gym with SEPARATE men's and women's
 * sections admits both, so it must appear under "men" and under "women". An
 * exact-equality check hides it from both, which is how a real gym ends up
 * invisible to every member who would have joined it.
 *
 * A mixed gym is deliberately NOT returned for "men" or "women". Someone who
 * picks "women" in this market usually means a women-only space, and quietly
 * including mixed gyms would break that expectation.
 */
// A PURE FUNCTION: same inputs always give the same output, and it touches
// nothing outside itself. Pure functions are trivial to unit-test — see
// gym.test.ts next to this file for exactly that.
export function admits(access: GymAccess, filter: AccessFilter): boolean {
  if (access === "separate_sections") return filter === "men" || filter === "women";
  return access === filter;
}

// ── A discriminated union again, this time with four cases ──
//
// Every branch carries a `state` field with a different literal value. That
// shared field is the DISCRIMINANT: checking it tells TypeScript which branch
// you are in, and therefore which other fields exist.
//
//   if (v.state === "rejected") { v.reason }    ✅ compiles
//   if (v.state === "verified") { v.reason }    ❌ error — no `reason` here
//
// Note that each state carries exactly the data that state needs, and no
// more. A single flat interface with every field optional would compile just
// as well but would let you construct nonsense: verified with a rejection
// reason, pending with a verification date.
//
// The leading `|` before the first branch is purely cosmetic formatting.
export type VerificationStatus =
  | { readonly state: "unverified" }
  | { readonly state: "pending"; readonly submittedAt: string }
  | { readonly state: "verified"; readonly verifiedAt: string }
  | { readonly state: "rejected"; readonly reason: string; readonly rejectedAt: string };

/** Every user-facing string exists in both languages. The type enforces it, not discipline. */
// Because both fields are required, you cannot construct a `Localized` with
// only English. Forgetting the Arabic is a build failure rather than a blank
// space that ships to production.
export interface Localized {
  readonly ar: string;
  readonly en: string;
}

// The central data shape of the app. Everything else — cards, detail pages,
// the admin console — is a rendering of this.
export interface Gym {
  readonly id: string;
  // Not `string`, but `Localized`. So `gym.name` is an object, and you read
  // `gym.name.en` or `gym.name[locale]` to get text. That is why components
  // throughout the app write `gym.name[locale]`.
  readonly name: Localized;
  readonly description: Localized;
  readonly governorate: Governorate;
  readonly area: Localized;
  readonly access: GymAccess;
  readonly verification: VerificationStatus;
  // `number | null` — a gym with no reviews yet genuinely has no rating.
  // `null` says "there is deliberately nothing here", which is honest; a 0
  // would be a lie that sorts the gym to the bottom as though it were awful.
  readonly rating: number | null;
  readonly reviewCount: number;
  // Null when the gym has published no plans yet.
  readonly startingPrice: Fils | null;
  // `readonly string[]` is an array that cannot be pushed to or reassigned
  // through this reference. Again compile-time only.
  readonly photos: readonly string[];
  readonly amenities: readonly string[];
  // An inline nested object type. Fine for a shape used in exactly one place;
  // pull it out into its own named type once a second file needs it.
  readonly location: { readonly lat: number; readonly lng: number };
}
