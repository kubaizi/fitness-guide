import { fils } from "@fg/core";
import type { Gym, Membership, MembershipPlan } from "@fg/core";

import gymsJson from "@/db/gyms.json";
import plansJson from "@/db/plans.json";
import usersJson from "@/db/users.json";
import membershipsJson from "@/db/memberships.json";

/**
 * The JSON data store.
 *
 * There is no database server. The files in `apps/web/db/` ARE the data, and
 * they are imported directly — so they get bundled at build time and work
 * anywhere, including a Vercel deploy with no environment variables at all.
 *
 * This is a deliberate stopgap for the demo. When a real database arrives
 * (Azure, AWS, or back to Postgres), only this file changes: every function
 * below already returns the domain types from @fg/core, so no screen knows or
 * cares where the data came from.
 *
 * ─── On writing ──────────────────────────────────────────────────────────
 *
 * The imported JSON is frozen by the bundler, so edits go to the mutable
 * copies below. `persist()` then tries to write the file back, which succeeds
 * locally and fails on a serverless host, where the filesystem is read-only.
 *
 * That means: edits always show immediately, they survive a restart on your
 * machine, and on Vercel they last only as long as that server instance. The
 * editor screens say so plainly rather than pretending otherwise.
 */

/**
 * Mutable working copies. structuredClone because the imported JSON is shared
 * module state — mutating it directly would corrupt the pristine import.
 */
const gyms: RawGym[] = structuredClone(gymsJson);
const plans: RawPlan[] = structuredClone(plansJson);

export interface GymDetail extends Gym {
  readonly slug: string;
  readonly hours: { readonly ar: string; readonly en: string };
  readonly address: { readonly ar: string; readonly en: string };
  readonly openNow: boolean;
}

// The JSON is typed loosely on import; these narrow it back to the domain.
type RawGym = (typeof gymsJson)[number];
type RawPlan = (typeof plansJson)[number];
type RawMembership = (typeof membershipsJson)[number];

/** Rebuilds the verification union from the flat stored value. */
function toVerification(g: RawGym): Gym["verification"] {
  switch (g.verification) {
    case "verified":
      return { state: "verified", verifiedAt: g.verifiedAt ?? "" };
    case "pending":
      return { state: "pending", submittedAt: g.submittedAt ?? "" };
    case "rejected":
      return {
        state: "rejected",
        reason: g.rejectionReason ?? "",
        rejectedAt: g.verifiedAt ?? "",
      };
    case "unverified":
      return { state: "unverified" };
    default:
      throw new Error(`Unknown verification state: ${g.verification}`);
  }
}

function toGym(g: RawGym): GymDetail {
  const prices = plans
    .filter((p) => p.gymId === g.id && p.active)
    .map((p) => p.offerPrice ?? p.listPrice);

  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    description: g.description,
    area: g.area,
    address: g.address,
    hours: g.hours,
    governorate: g.governorate as Gym["governorate"],
    access: g.access as Gym["access"],
    verification: toVerification(g),
    rating: g.rating,
    reviewCount: g.reviewCount,
    startingPrice: prices.length > 0 ? fils(Math.min(...prices)) : null,
    photos: g.photos,
    amenities: g.amenities,
    location: { lat: g.latitude, lng: g.longitude },
    openNow: g.openNow,
  };
}

const toPlan = (p: RawPlan): MembershipPlan => ({
  id: p.id,
  gymId: p.gymId,
  name: p.name,
  duration: p.duration as MembershipPlan["duration"],
  listPrice: fils(p.listPrice),
  offerPrice: p.offerPrice === null ? null : fils(p.offerPrice),
});

function toStatus(m: RawMembership): Membership["status"] {
  switch (m.state) {
    case "active":
      return { state: "active", startsOn: m.startsOn ?? "", endsOn: m.endsOn ?? "" };
    case "frozen":
      return { state: "frozen", frozenAt: m.frozenAt ?? "", resumesOn: m.resumesOn };
    case "expired":
      return { state: "expired", endedOn: m.endedOn ?? "" };
    case "cancelled":
      return {
        state: "cancelled",
        cancelledAt: m.cancelledAt ?? "",
        refund: m.refundAmount === null ? null : fils(m.refundAmount),
      };
    case "pending_payment":
      return { state: "pending_payment" };
    default:
      throw new Error(`Unknown membership state: ${m.state}`);
  }
}

const toMembership = (m: RawMembership): Membership => ({
  id: m.id,
  userId: m.userId,
  gymId: m.gymId,
  planId: m.planId,
  status: toStatus(m),
  pricePaid: fils(m.pricePaid),
  checkInToken: m.checkInToken,
});

// ─────────────────────────────────────────────────────────────────────── gyms

export const getGyms = (): readonly GymDetail[] => gyms.map(toGym);

export const findGymBySlug = (slug: string): GymDetail | null => {
  const g = gyms.find((x) => x.slug === slug);
  return g ? toGym(g) : null;
};

export const findGymById = (id: string): GymDetail | null => {
  const g = gyms.find((x) => x.id === id);
  return g ? toGym(g) : null;
};

// ────────────────────────────────────────────────────────────────────── plans

export const plansForGym = (gymId: string): readonly MembershipPlan[] =>
  plans
    .filter((p) => p.gymId === gymId && p.active)
    .sort((a, b) => a.listPrice - b.listPrice)
    .map(toPlan);

export const findPlan = (id: string): MembershipPlan | null => {
  const p = plans.find((x) => x.id === id);
  return p ? toPlan(p) : null;
};

export const findPlanWithGym = (
  id: string,
): { plan: MembershipPlan; gym: GymDetail } | null => {
  const p = plans.find((x) => x.id === id);
  if (!p) return null;
  const g = gyms.find((x) => x.id === p.gymId);
  if (!g) return null;
  return { plan: toPlan(p), gym: toGym(g) };
};

// ────────────────────────────────────────────────────────────────────── users

export interface DemoUser {
  readonly id: string;
  readonly username: string;
  /** Null for the admin account, which signs in by username only. */
  readonly phone: string | null;
  readonly name: string;
  readonly role: string;
  readonly locale: string;
}

/** Everything above, plus the stored hash. Never leaves the server. */
interface StoredUser extends DemoUser {
  readonly passwordSalt: string;
  readonly passwordHash: string;
}

/** Strips the password fields — this is what the rest of the app may see. */
const publicUser = (u: StoredUser): DemoUser => ({
  id: u.id,
  username: u.username,
  phone: u.phone,
  name: u.name,
  role: u.role,
  locale: u.locale,
});

export const findUserById = (id: string): DemoUser | null => {
  const u = usersJson.find((x) => x.id === id);
  return u ? publicUser(u) : null;
};

/**
 * Looks up an account by username OR phone number, for the login form.
 *
 * Returns the STORED user, hash included, so only the sign-in action can call
 * it. Everything else uses findUserById, which cannot leak a hash.
 */
export const findUserForLogin = (identifier: string): StoredUser | null => {
  const needle = identifier.trim().toLowerCase();
  return (
    usersJson.find((u) => u.username.toLowerCase() === needle) ??
    usersJson.find((u) => u.phone !== null && u.phone === identifier) ??
    null
  );
};

// ──────────────────────────────────────────────────────────────── memberships

export interface MembershipListItem {
  readonly membership: Membership;
  readonly gymName: { readonly ar: string; readonly en: string };
  readonly planName: { readonly ar: string; readonly en: string };
}

export const membershipsForUser = (userId: string): readonly Membership[] =>
  membershipsJson.filter((m) => m.userId === userId).map(toMembership);

export function membershipsWithDetailsForUser(
  userId: string,
): readonly MembershipListItem[] {
  return membershipsJson
    .filter((m) => m.userId === userId)
    .map((m) => {
      const gym = gyms.find((g) => g.id === m.gymId);
      const plan = plans.find((p) => p.id === m.planId);
      if (!gym || !plan) return null;
      return {
        membership: toMembership(m),
        gymName: gym.name,
        planName: plan.name,
      };
    })
    .filter((x): x is MembershipListItem => x !== null);
}

/** Scoped by owner, so one user cannot read another's QR entry code. */
export const findMembershipForUser = (id: string, userId: string): Membership | null => {
  const m = membershipsJson.find((x) => x.id === id && x.userId === userId);
  return m ? toMembership(m) : null;
};

export const findMembershipForGym = (gymId: string): Membership | null => {
  const m = membershipsJson.find((x) => x.gymId === gymId);
  return m ? toMembership(m) : null;
};

// ────────────────────────────────────────────────────────────────────── admin

export interface AdminUserRow {
  readonly user: DemoUser;
  readonly membershipCount: number;
  readonly activeCount: number;
  /** Fils. Everything this user has paid, across all memberships. */
  readonly totalPaid: number;
}

/**
 * Every user, with a few figures worth seeing at a glance.
 *
 * Goes through `publicUser`, so the password hash and salt cannot reach a
 * page even by accident.
 */
export function adminUsers(): readonly AdminUserRow[] {
  return usersJson.map((u) => {
    const mine = membershipsJson.filter((m) => m.userId === u.id);
    return {
      user: publicUser(u),
      membershipCount: mine.length,
      activeCount: mine.filter((m) => m.state === "active").length,
      totalPaid: mine.reduce((sum, m) => sum + m.pricePaid, 0),
    };
  });
}

export interface AdminGymRow {
  readonly gym: GymDetail;
  readonly planCount: number;
  readonly memberCount: number;
  /** Fils. Gross taken through this gym, across all its memberships. */
  readonly grossRevenue: number;
}

export function adminGyms(): readonly AdminGymRow[] {
  return gyms.map((g) => {
    const mine = membershipsJson.filter((m) => m.gymId === g.id);
    return {
      gym: toGym(g),
      planCount: plans.filter((p) => p.gymId === g.id && p.active).length,
      memberCount: mine.filter((m) => m.state === "active").length,
      grossRevenue: mine.reduce((sum, m) => sum + m.pricePaid, 0),
    };
  });
}

// ─────────────────────────────────────────────────────────────────── writing

/**
 * Writes a collection back to its JSON file.
 *
 * Succeeds on a normal filesystem, throws EROFS on a serverless host. Either
 * way the in-memory copy is already updated, so the UI is correct — this only
 * decides whether the change outlives the process. The dynamic import keeps
 * node:fs out of any client bundle.
 */
async function persist(file: string, data: unknown): Promise<"file" | "memory"> {
  try {
    const { writeFile } = await import("node:fs/promises");
    const path = await import("node:path");
    await writeFile(
      path.join(process.cwd(), "db", `${file}.json`),
      JSON.stringify(data, null, 2) + "\n",
      "utf8",
    );
    return "file";
  } catch {
    // Read-only filesystem, or running from a bundle. Not an error here.
    return "memory";
  }
}

export interface GymProfileInput {
  readonly nameAr: string;
  readonly nameEn: string;
  readonly descriptionAr: string;
  readonly descriptionEn: string;
  readonly areaAr: string;
  readonly areaEn: string;
  readonly addressAr: string;
  readonly addressEn: string;
  readonly hoursAr: string;
  readonly hoursEn: string;
  readonly governorate: string;
  readonly access: string;
  readonly amenities: readonly string[];
}

export async function updateGymProfile(
  slug: string,
  input: GymProfileInput,
): Promise<"file" | "memory" | null> {
  const gym = gyms.find((g) => g.slug === slug);
  if (!gym) return null;

  gym.name = { ar: input.nameAr, en: input.nameEn };
  gym.description = { ar: input.descriptionAr, en: input.descriptionEn };
  gym.area = { ar: input.areaAr, en: input.areaEn };
  gym.address = { ar: input.addressAr, en: input.addressEn };
  gym.hours = { ar: input.hoursAr, en: input.hoursEn };
  gym.governorate = input.governorate;
  gym.access = input.access;
  gym.amenities = [...input.amenities];

  return persist("gyms", gyms);
}

export interface PlanInput {
  readonly nameAr: string;
  readonly nameEn: string;
  /** Human-written KWD, e.g. "19.900". Converted to fils by parseKwd. */
  readonly listPrice: number;
  readonly offerPrice: number | null;
  readonly active: boolean;
}

export async function updatePlan(
  id: string,
  input: PlanInput,
): Promise<"file" | "memory" | null> {
  const plan = plans.find((p) => p.id === id);
  if (!plan) return null;

  plan.name = { ar: input.nameAr, en: input.nameEn };
  plan.listPrice = input.listPrice;
  plan.offerPrice = input.offerPrice;
  plan.active = input.active;

  return persist("plans", plans);
}

/** Every plan for a gym, including inactive ones — the editor must see those. */
export const allPlansForGym = (gymId: string): readonly MembershipPlan[] =>
  plans
    .filter((p) => p.gymId === gymId)
    .sort((a, b) => a.listPrice - b.listPrice)
    .map(toPlan);

export const isPlanActive = (id: string): boolean =>
  plans.find((p) => p.id === id)?.active ?? false;

/** The gym a staff member or owner belongs to. */
export const gymForStaff = (userId: string): GymDetail | null => {
  const u = usersJson.find((x) => x.id === userId);
  const staffAtGymId = (u as { staffAtGymId?: string } | undefined)?.staffAtGymId;
  if (!staffAtGymId) return null;
  const g = gyms.find((x) => x.id === staffAtGymId);
  return g ? toGym(g) : null;
};
