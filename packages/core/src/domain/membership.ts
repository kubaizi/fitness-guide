import type { Fils } from "../money";

// The five lengths of membership a gym can sell. A union of string literals
// again — see gym.ts for why these are used instead of an enum.
export type PlanDuration =
  "day_pass" | "monthly" | "quarterly" | "half_yearly" | "yearly";

// What a gym offers for sale. Distinct from `Membership` below, which is what
// somebody actually bought. Plan = the item on the menu; Membership = the order.
export interface MembershipPlan {
  readonly id: string;
  // A FOREIGN KEY by convention: the `id` of the gym this plan belongs to.
  // Nothing enforces that the gym exists — there is no database here, just
  // JSON files. See apps/web/db/README.md on why ids must be kept consistent
  // by hand.
  readonly gymId: string;
  // Written out inline instead of reusing the `Localized` interface from
  // gym.ts. Structurally identical, so TypeScript treats them as compatible:
  // it matches types by SHAPE, not by name (unlike C#, where two identical
  // classes are still different types). This is called structural typing.
  readonly name: { readonly ar: string; readonly en: string };
  readonly duration: PlanDuration;
  /** What the gym charges normally. */
  readonly listPrice: Fils;
  /** The exclusive in-app price, when an offer is running. */
  // Null means "no offer running", not "free". Any code showing a price must
  // decide between `offerPrice ?? listPrice`.
  readonly offerPrice: Fils | null;
}

/**
 * The lifecycle of a purchased membership.
 *
 * Each state carries only the data that state can have: a cancelled membership
 * has a `refund`, an active one does not. In C# you would need separate classes
 * or nullable fields everywhere. Here the compiler stops you reading `refund`
 * off a membership that was never cancelled.
 */
// Five states, each with a `state` discriminant. To handle one of these you
// typically switch on `.state`, and TypeScript narrows the type inside each
// branch so only the fields that exist there are reachable.
//
// Dates are stored as `string`, not `Date`. Two reasons: these values come
// straight out of JSON files (JSON has no date type), and ISO-8601 strings
// like "2026-08-23" sort correctly as plain text. Convert to `Date` only at
// the point you need to do date arithmetic or formatting.
export type MembershipStatus =
  | { readonly state: "pending_payment" }
  | { readonly state: "active"; readonly startsOn: string; readonly endsOn: string }
  | {
      readonly state: "frozen";
      readonly frozenAt: string;
      // Null when the member froze indefinitely and has not named a return date.
      readonly resumesOn: string | null;
    }
  | { readonly state: "expired"; readonly endedOn: string }
  | {
      readonly state: "cancelled";
      readonly cancelledAt: string;
      // Null when cancelled without a refund.
      readonly refund: Fils | null;
    };

export interface Membership {
  readonly id: string;
  // Three foreign keys. `planId` is kept alongside `gymId` even though the
  // plan already knows its gym — denormalising like this means the gym can be
  // read without loading the plan, which matters when the "database" is a set
  // of JSON files being filtered in memory.
  readonly userId: string;
  readonly gymId: string;
  readonly planId: string;
  readonly status: MembershipStatus;
  // The price at the moment of purchase, stored rather than looked up. If the
  // gym later changes the plan's price, historical receipts must not change
  // with it — that is why this is a copy and not a reference.
  readonly pricePaid: Fils;
  /** Rotating token behind the QR code - never the raw membership id. */
  // Separate from `id` so that a leaked QR code can be invalidated by issuing
  // a new token, without changing the membership's identity everywhere else.
  readonly checkInToken: string;
}
