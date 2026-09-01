import type { Fils } from "../money";

/**
 * Kuwait has six governorates. Modelling this as a union rather than a plain
 * string means a typo is a compile error, not a filter that silently returns
 * nothing at runtime.
 */
export type Governorate =
  "capital" | "hawalli" | "farwaniya" | "ahmadi" | "jahra" | "mubarak_al_kabeer";

/** Who a gym admits. Drives eligibility, filtering, and which photos may be shown. */
export type GymAccess = "men" | "women" | "mixed" | "separate_sections";

/** What a member can filter by. There is no "separate sections" choice: a
 *  member is looking for somewhere they can train, not for a building
 *  arrangement. */
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
export function admits(access: GymAccess, filter: AccessFilter): boolean {
  if (access === "separate_sections") return filter === "men" || filter === "women";
  return access === filter;
}

export type VerificationStatus =
  | { readonly state: "unverified" }
  | { readonly state: "pending"; readonly submittedAt: string }
  | { readonly state: "verified"; readonly verifiedAt: string }
  | { readonly state: "rejected"; readonly reason: string; readonly rejectedAt: string };

/** Every user-facing string exists in both languages. The type enforces it, not discipline. */
export interface Localized {
  readonly ar: string;
  readonly en: string;
}

export interface Gym {
  readonly id: string;
  readonly name: Localized;
  readonly description: Localized;
  readonly governorate: Governorate;
  readonly area: Localized;
  readonly access: GymAccess;
  readonly verification: VerificationStatus;
  readonly rating: number | null;
  readonly reviewCount: number;
  readonly startingPrice: Fils | null;
  readonly photos: readonly string[];
  readonly amenities: readonly string[];
  readonly location: { readonly lat: number; readonly lng: number };
}
