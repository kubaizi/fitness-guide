import type { Membership } from "@fg/core";
import type { TranslationKey } from "@fg/i18n";

/**
 * Presentation helpers for a membership's state.
 *
 * These live here rather than on a page because three screens now read the
 * same union: the member's own list, the gym's roster, and (next) the admin
 * view. A second copy of the switch is a second place to forget a new state.
 */

/**
 * Maps each state to its label and tone.
 *
 * Written as a switch with no `default` so TypeScript checks exhaustiveness:
 * add a state to the union in @fg/core and this stops compiling until it is
 * handled. That is the whole point of the discriminated union.
 */
// ── EXHAUSTIVENESS CHECKING — worth understanding, it is a genuine superpower ──
//
// This function promises to return an object. TypeScript checks every path
// through the switch and, because `status.state` is a union of exactly five
// literals and all five are handled, it can prove the function always returns.
//
// Now add a sixth state to `MembershipStatus` in @fg/core. Suddenly there is
// a path where nothing matches, the function implicitly returns `undefined`,
// and the promised return type is violated — so THIS FILE stops compiling,
// pointing straight at the code that needs updating.
//
// Adding `default: return {...}` would silence that forever, which is exactly
// why there is no default here. The missing default is the feature.
//
// This is why the codebase prefers unions over enums and switches over
// if/else chains: the compiler becomes a checklist you cannot skip.
export function describeStatus(status: Membership["status"]): {
  key: TranslationKey;
  tone: "ok" | "warn" | "neutral";
} {
  switch (status.state) {
    case "active":
      // Returns a translation KEY, not translated text. The caller runs it
      // through `t()`, which keeps this file free of any locale — the same
      // reason it returns a `tone` rather than a colour.
      return { key: "membership.active", tone: "ok" };
    case "pending_payment":
      return { key: "membership.pendingPayment", tone: "warn" };
    case "frozen":
      return { key: "membership.frozen", tone: "warn" };
    case "expired":
      return { key: "membership.expired", tone: "neutral" };
    case "cancelled":
      return { key: "membership.cancelled", tone: "neutral" };
  }
}

/** The date the membership began, where the state records one. */
// Only the `active` branch of the union has a `startsOn` field, so this
// cannot be written as `status.startsOn` — the compiler rejects reading a
// field that does not exist on every branch. The comparison narrows the type
// first, which is what makes the property access legal.
export function startDateOf(status: Membership["status"]): string | null {
  return status.state === "active" ? status.startsOn : null;
}

/**
 * The date it ends or ended. Not every state has one.
 *
 * Cancelled deliberately returns null: `cancelledAt` is when the member quit,
 * not when access stops, and showing it under an "Expires" heading would
 * quietly misreport it.
 */
// This switch DOES have a default, unlike describeStatus above. The
// difference: here the default is a deliberate answer ("these states have no
// end date"), not an oversight waiting to happen. A new state genuinely
// defaults to having no end date, so nothing needs to break.
//
// Knowing when to want exhaustiveness and when a default is correct is the
// judgement call — the two functions in this file are a matched pair of examples.
export function endDateOf(status: Membership["status"]): string | null {
  switch (status.state) {
    case "active":
      return status.endsOn;
    case "expired":
      return status.endedOn;
    default:
      return null;
  }
}
