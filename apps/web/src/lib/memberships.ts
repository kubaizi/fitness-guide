import { parseKwd } from "@fg/core";
import type { Membership } from "@fg/core";

/**
 * Sample memberships for the signed-in user.
 *
 * Typed against the real `Membership` domain type, so the screens are forced
 * to handle every `MembershipStatus` variant — active, expired, and the ones
 * that carry different data. When auth and the API arrive, only this file goes.
 */
export const MEMBERSHIPS: readonly Membership[] = [
  {
    id: "mem-8241",
    userId: "user-1",
    gymId: "iron-club",
    planId: "iron-monthly",
    status: {
      state: "active",
      startsOn: "2026-07-12T00:00:00Z",
      endsOn: "2026-08-12T00:00:00Z",
    },
    pricePaid: parseKwd("19.900"),
    // Rotating token — never the membership id itself, so a leaked screenshot
    // of the QR cannot be replayed indefinitely.
    checkInToken: "FG-8241-K7QX2M",
  },
  {
    id: "mem-7730",
    userId: "user-1",
    gymId: "nawa-studio",
    planId: "nawa-monthly",
    status: { state: "expired", endedOn: "2026-06-30T00:00:00Z" },
    pricePaid: parseKwd("32.500"),
    checkInToken: "FG-7730-B3PL9D",
  },
];

export const findMembership = (id: string): Membership | undefined =>
  MEMBERSHIPS.find((m) => m.id === id);
