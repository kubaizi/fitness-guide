import { fils } from "@fg/core";
import type { Gym, MembershipPlan } from "@fg/core";
import { prisma } from "./prisma";

/**
 * The gym data layer.
 *
 * Every function here returns the DOMAIN types from @fg/core, not Prisma's
 * generated row types. That boundary is deliberate: the screens already speak
 * the domain language, so swapping the sample arrays for real queries did not
 * change a single component's props.
 *
 * It also converts money at the edge. Prisma types an `Int` column as a plain
 * `number`; `fils()` turns it into the branded `Fils` type and throws if the
 * value is somehow not a whole number.
 */

export interface GymDetail extends Gym {
  /** Stable, human-readable URL identifier. Routes use this, never the id. */
  readonly slug: string;
  readonly hours: { readonly ar: string; readonly en: string };
  readonly address: { readonly ar: string; readonly en: string };
  readonly openNow: boolean;
}

/** The shape Prisma gives back for the queries below. */
type GymRow = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  areaAr: string;
  areaEn: string;
  addressAr: string;
  addressEn: string;
  hoursAr: string;
  hoursEn: string;
  governorate: Gym["governorate"];
  access: Gym["access"];
  verification: string;
  verifiedAt: Date | null;
  submittedAt: Date | null;
  rejectionReason: string | null;
  rating: number | null;
  reviewCount: number;
  latitude: number;
  longitude: number;
  amenities: string[];
  photos: { url: string }[];
  plans: { listPrice: number; offerPrice: number | null }[];
};

/**
 * Rebuilds the discriminated union from the flat columns.
 *
 * The database stores verification as an enum plus a few nullable dates,
 * because that is what relational schemas do. The application wants a union
 * where each state carries only its own data. This is where one becomes the
 * other — and the `default` throw means an unhandled enum value fails loudly
 * rather than rendering as unverified.
 */
function toVerification(row: GymRow): Gym["verification"] {
  switch (row.verification) {
    case "verified":
      return {
        state: "verified",
        verifiedAt: (row.verifiedAt ?? new Date()).toISOString(),
      };
    case "pending":
      return {
        state: "pending",
        submittedAt: (row.submittedAt ?? new Date()).toISOString(),
      };
    case "rejected":
      return {
        state: "rejected",
        reason: row.rejectionReason ?? "",
        rejectedAt: (row.verifiedAt ?? new Date()).toISOString(),
      };
    case "unverified":
      return { state: "unverified" };
    default:
      throw new Error(`Unknown verification state: ${row.verification}`);
  }
}

function toGymDetail(row: GymRow): GymDetail {
  // The cheapest active plan is what the card advertises.
  const prices = row.plans.map((p) => p.offerPrice ?? p.listPrice);
  const startingPrice = prices.length > 0 ? fils(Math.min(...prices)) : null;

  return {
    id: row.id,
    slug: row.slug,
    name: { ar: row.nameAr, en: row.nameEn },
    description: { ar: row.descriptionAr, en: row.descriptionEn },
    area: { ar: row.areaAr, en: row.areaEn },
    address: { ar: row.addressAr, en: row.addressEn },
    hours: { ar: row.hoursAr, en: row.hoursEn },
    governorate: row.governorate,
    access: row.access,
    verification: toVerification(row),
    rating: row.rating,
    reviewCount: row.reviewCount,
    startingPrice,
    photos: row.photos.map((p) => p.url),
    amenities: row.amenities,
    location: { lat: row.latitude, lng: row.longitude },
    // TODO: derive from the opening-hours schedule once that model exists.
    // Hardcoding it here is honest about the fact that it is not real yet.
    openNow: true,
  };
}

const gymInclude = {
  photos: { orderBy: { position: "asc" } },
  plans: { where: { active: true }, select: { listPrice: true, offerPrice: true } },
} as const;

export async function getGyms(): Promise<readonly GymDetail[]> {
  const rows = await prisma.gym.findMany({
    include: gymInclude,
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => toGymDetail(r as GymRow));
}

export async function findGymBySlug(slug: string): Promise<GymDetail | null> {
  const row = await prisma.gym.findUnique({ where: { slug }, include: gymInclude });
  return row ? toGymDetail(row as GymRow) : null;
}

/** By primary key — for following a foreign key, not for routing. */
export async function findGymById(id: string): Promise<GymDetail | null> {
  const row = await prisma.gym.findUnique({ where: { id }, include: gymInclude });
  return row ? toGymDetail(row as GymRow) : null;
}

// ────────────────────────────────────────────────────────────────────── plans

type PlanRow = {
  id: string;
  gymId: string;
  nameAr: string;
  nameEn: string;
  duration: MembershipPlan["duration"];
  listPrice: number;
  offerPrice: number | null;
};

const toPlan = (row: PlanRow): MembershipPlan => ({
  id: row.id,
  gymId: row.gymId,
  name: { ar: row.nameAr, en: row.nameEn },
  duration: row.duration,
  listPrice: fils(row.listPrice),
  offerPrice: row.offerPrice === null ? null : fils(row.offerPrice),
});

/** Plan ordering is by price, so the cheapest option reads first. */
export async function plansForGym(gymId: string): Promise<readonly MembershipPlan[]> {
  const rows = await prisma.membershipPlan.findMany({
    where: { gymId, active: true },
    orderBy: { listPrice: "asc" },
  });
  return rows.map((r) => toPlan(r as PlanRow));
}

export async function findPlan(id: string): Promise<MembershipPlan | null> {
  const row = await prisma.membershipPlan.findUnique({ where: { id } });
  return row ? toPlan(row as PlanRow) : null;
}

/** The gym a plan belongs to — checkout needs both together. */
export async function findPlanWithGym(
  id: string,
): Promise<{ plan: MembershipPlan; gym: GymDetail } | null> {
  const row = await prisma.membershipPlan.findUnique({
    where: { id },
    include: { gym: { include: gymInclude } },
  });
  if (!row) return null;
  return { plan: toPlan(row as PlanRow), gym: toGymDetail(row.gym as GymRow) };
}
