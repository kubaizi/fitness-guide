import type { Fils } from "../money";

export type PlanDuration =
  "day_pass" | "monthly" | "quarterly" | "half_yearly" | "yearly";

export interface MembershipPlan {
  readonly id: string;
  readonly gymId: string;
  readonly name: { readonly ar: string; readonly en: string };
  readonly duration: PlanDuration;
  /** What the gym charges normally. */
  readonly listPrice: Fils;
  /** The exclusive in-app price, when an offer is running. */
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
export type MembershipStatus =
  | { readonly state: "pending_payment" }
  | { readonly state: "active"; readonly startsOn: string; readonly endsOn: string }
  | {
      readonly state: "frozen";
      readonly frozenAt: string;
      readonly resumesOn: string | null;
    }
  | { readonly state: "expired"; readonly endedOn: string }
  | {
      readonly state: "cancelled";
      readonly cancelledAt: string;
      readonly refund: Fils | null;
    };

export interface Membership {
  readonly id: string;
  readonly userId: string;
  readonly gymId: string;
  readonly planId: string;
  readonly status: MembershipStatus;
  readonly pricePaid: Fils;
  /** Rotating token behind the QR code - never the raw membership id. */
  readonly checkInToken: string;
}
