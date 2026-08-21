import "server-only";
import { fils } from "@fg/core";
import type { Membership } from "@fg/core";
import { prisma } from "./prisma";
import { getCurrentUser } from "./dal";

/**
 * The membership data layer.
 *
 * Like the gym layer, this returns @fg/core domain types rather than Prisma
 * rows — in particular it rebuilds `MembershipStatus` as a discriminated
 * union, so each state carries only the fields that state can have.
 */

type MembershipRow = {
  id: string;
  userId: string;
  gymId: string;
  planId: string;
  state: string;
  startsOn: Date | null;
  endsOn: Date | null;
  frozenAt: Date | null;
  resumesOn: Date | null;
  cancelledAt: Date | null;
  endedOn: Date | null;
  pricePaid: number;
  refundAmount: number | null;
  checkInToken: string;
};

const iso = (d: Date | null): string => (d ?? new Date()).toISOString();

function toStatus(row: MembershipRow): Membership["status"] {
  switch (row.state) {
    case "active":
      return { state: "active", startsOn: iso(row.startsOn), endsOn: iso(row.endsOn) };
    case "frozen":
      return {
        state: "frozen",
        frozenAt: iso(row.frozenAt),
        resumesOn: row.resumesOn ? row.resumesOn.toISOString() : null,
      };
    case "expired":
      return { state: "expired", endedOn: iso(row.endedOn) };
    case "cancelled":
      return {
        state: "cancelled",
        cancelledAt: iso(row.cancelledAt),
        refund: row.refundAmount === null ? null : fils(row.refundAmount),
      };
    case "pending_payment":
      return { state: "pending_payment" };
    default:
      throw new Error(`Unknown membership state: ${row.state}`);
  }
}

const toMembership = (row: MembershipRow): Membership => ({
  id: row.id,
  userId: row.userId,
  gymId: row.gymId,
  planId: row.planId,
  status: toStatus(row),
  pricePaid: fils(row.pricePaid),
  checkInToken: row.checkInToken,
});

/**
 * Memberships for the signed-in user.
 *
 * The authorisation check lives HERE, not only in the page above it. Next's
 * auth guide is explicit that route-level checks are a first pass — this is
 * the one that actually guards the data, so no caller can forget it.
 */
export async function getMyMemberships(): Promise<readonly Membership[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await prisma.membership.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => toMembership(r as MembershipRow));
}

/**
 * A single membership, scoped to its owner.
 *
 * Scoping by `userId` as well as `id` is what stops someone pasting another
 * member's id into the URL and seeing their QR entry code.
 */
export async function findMembership(id: string): Promise<Membership | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const row = await prisma.membership.findFirst({ where: { id, userId: user.id } });
  return row ? toMembership(row as MembershipRow) : null;
}

/** A membership together with the names the list screen needs to show. */
export interface MembershipListItem {
  readonly membership: Membership;
  readonly gymName: { readonly ar: string; readonly en: string };
  readonly planName: { readonly ar: string; readonly en: string };
}

/**
 * The memberships list, with gym and plan joined in a single query.
 *
 * Looking each one up per row would be an N+1: one query for the list, then
 * two more per membership. `include` makes it one round trip.
 */
export async function getMyMembershipsWithDetails(): Promise<
  readonly MembershipListItem[]
> {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await prisma.membership.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      gym: { select: { nameAr: true, nameEn: true } },
      plan: { select: { nameAr: true, nameEn: true } },
    },
  });

  return rows.map((r) => ({
    membership: toMembership(r as MembershipRow),
    gymName: { ar: r.gym.nameAr, en: r.gym.nameEn },
    planName: { ar: r.plan.nameAr, en: r.plan.nameEn },
  }));
}

/** The most recent membership at a gym — used by the confirmation screen. */
export async function findMembershipForGym(gymId: string): Promise<Membership | null> {
  const row = await prisma.membership.findFirst({
    where: { gymId },
    orderBy: { createdAt: "desc" },
  });
  return row ? toMembership(row as MembershipRow) : null;
}
