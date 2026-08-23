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
export function describeStatus(status: Membership["status"]): {
  key: TranslationKey;
  tone: "ok" | "warn" | "neutral";
} {
  switch (status.state) {
    case "active":
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
