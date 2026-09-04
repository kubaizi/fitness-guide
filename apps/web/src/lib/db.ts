import "server-only";

import { fils } from "@fg/core";
import type { Gym, Membership, MembershipPlan } from "@fg/core";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Every question the app asks the database.
 *
 * ─── What changed, and why it matters ────────────────────────────────────
 *
 * This file used to read JSON files out of `apps/web/db/`. It now reads
 * Postgres, hosted on Neon. Nothing else in the app changed shape: every
 * function here still returns the domain types from `@fg/core`, so no screen
 * knows or cares where the data came from. That was the whole point of putting
 * the queries behind one file.
 *
 * The JSON files are still in the repo. They are no longer the data — they are
 * the *seed* for the data. `prisma/seed.mjs` loads them into the tables.
 *
 * One real difference the rest of the app must live with: **every function
 * here is now async.** Talking to a database means waiting on the network, and
 * JavaScript expresses waiting with a Promise. So `getGyms()` used to hand
 * back an array and now hands back a promise of one, which callers `await`.
 * Server Components can await directly in the body of the component, so in
 * practice this meant adding the word `await` at each call site.
 *
 * ─── The shape of this file ──────────────────────────────────────────────
 *
 *   1. MAPPERS   (toGym, toPlan, toMembership …)
 *      Turn a database row into a clean domain type. This is where loose data
 *      becomes trustworthy data: prices become branded `Fils`, flat columns
 *      become the structured unions the domain uses, `Date` becomes an ISO
 *      string for the UI.
 *
 *   2. QUERIES   (getGyms, findGymBySlug, membersForGym …)
 *      What the pages actually call.
 *
 *   3. WRITES    (updateGymProfile, updatePlan)
 *
 * The whole file runs on the SERVER only — `server-only` at the top makes that
 * a build error rather than a leak if anyone ever imports it from a client
 * component.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Row types
//
// Prisma generates a TypeScript type for every table from schema.prisma, so
// the types below are not hand-written — they are derived, and they change the
// moment you change the schema and re-run `prisma generate`.
//
// `Prisma.GymGetPayload<{ include: { plans: true } }>` says: "the Gym row as it
// looks when you also asked for its plans". Without the include, `.plans` is
// not on the type at all, so the compiler stops you reading a field you did
// not fetch. This is the part of Prisma worth appreciating: the query and the
// type cannot drift apart.
// ═══════════════════════════════════════════════════════════════════════════

type GymRow = Prisma.GymGetPayload<{ include: { plans: true } }>;
type PlanRow = Prisma.MembershipPlanGetPayload<object>;
type MembershipRow = Prisma.MembershipGetPayload<object>;

/**
 * Everything a gym page needs in one query. Used everywhere a gym is read, so
 * that `toGym` below always has the plans it needs to work out a price.
 */
const withPlans = { plans: true } as const;

// `extends` on an interface means "everything Gym has, plus what follows".
// Inheritance for shapes — much like C# interface inheritance.
//
// These extra fields exist in the database but not in the core `Gym` type,
// because they are presentation details rather than domain facts. Keeping them
// here rather than in @fg/core stops the shared domain model filling up with
// things only the web app cares about.
export interface GymDetail extends Gym {
  readonly slug: string; // the URL-friendly id, e.g. "iron-club"
  readonly hours: { readonly ar: string; readonly en: string };
  readonly address: { readonly ar: string; readonly en: string };
  readonly openNow: boolean;
  /**
   * Does this gym currently run an offer on any visible plan?
   *
   * Computed here rather than on the page, because "an offer" means "an active
   * plan whose offerPrice is set" — a rule about plans, which pages should not
   * have to know. Drives the Offers tile on the gyms landing page.
   */
  readonly hasOffer: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. MAPPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A database `Date` as the ISO string the domain types use.
 *
 * The domain deals in strings because a date crossing from server to browser
 * is serialised anyway, and an ISO-8601 string sorts and compares correctly as
 * plain text. Null stays null: "no end date" is a real answer, not a missing
 * one.
 */
const iso = (d: Date | null): string => (d === null ? "" : d.toISOString());

/** Rebuilds the verification union from the flat stored columns. */
// ── Why this mapper exists ──
// A table cannot express a discriminated union, so the row stores a flat
// `verification` column plus loose sibling columns. The domain type (see
// packages/core/src/domain/gym.ts) wants the structured version where each
// state carries exactly its own data. This function is the translation.
//
// `Gym["verification"]` is an INDEXED ACCESS TYPE: "the type of the
// `verification` field on `Gym`". Writing it this way rather than importing
// `VerificationStatus` means it tracks whatever `Gym` says, automatically.
function toVerification(g: GymRow): Gym["verification"] {
  // `switch` on a string. Same as C#, with one big caveat: without `break` or
  // `return`, execution FALLS THROUGH into the next case. Every branch here
  // returns, so it cannot bite — but it is the classic JavaScript switch bug.
  switch (g.verification) {
    case "verified":
      return { state: "verified", verifiedAt: iso(g.verifiedAt) };
    case "pending":
      return { state: "pending", submittedAt: iso(g.submittedAt) };
    case "rejected":
      return {
        state: "rejected",
        reason: g.rejectionReason ?? "",
        rejectedAt: iso(g.verifiedAt),
      };
    case "unverified":
      return { state: "unverified" };
    default:
      // Throwing rather than silently defaulting. Because `verification` is a
      // database enum this branch is now nearly unreachable — Postgres itself
      // rejects a seventh value — but a schema change that adds a state should
      // fail loudly here rather than quietly mis-badge a gym.
      throw new Error(`Unknown verification state: ${g.verification}`);
  }
}

function toGym(g: GymRow): GymDetail {
  // ── A two-step chain, read top to bottom ──
  //   .filter  keep only the active plans
  //   .map     replace each plan with just its effective price
  // The result is an array of numbers, ready for Math.min below.
  //
  // `p.offerPrice ?? p.listPrice` — the offer price when there is one,
  // otherwise the normal price. This is the "effective price" rule, and it
  // appears wherever a price is shown.
  const active = g.plans.filter((p) => p.active);
  const prices = active.map((p) => p.offerPrice ?? p.listPrice);

  return {
    id: g.id,
    slug: g.slug,
    // Two columns back into one object. The table stores `nameAr` and `nameEn`
    // separately so Postgres can index and search each language on its own;
    // the UI wants them together, keyed by locale.
    name: { ar: g.nameAr, en: g.nameEn },
    description: { ar: g.descriptionAr, en: g.descriptionEn },
    area: { ar: g.areaAr, en: g.areaEn },
    address: { ar: g.addressAr, en: g.addressEn },
    hours: { ar: g.hoursAr, en: g.hoursEn },
    // These casts are now nearly free of risk. `governorate` and `access` are
    // database enums, so Postgres will not store anything outside the six and
    // the four. The cast only bridges two separate declarations of the same
    // list — Prisma's and @fg/core's.
    governorate: g.governorate as Gym["governorate"],
    access: g.access as Gym["access"],
    verification: toVerification(g),
    rating: g.rating,
    reviewCount: g.reviewCount,
    // `Math.min(...prices)` uses the SPREAD operator. Math.min takes separate
    // arguments — min(1, 2, 3) — not an array, so `...` unpacks the array into
    // individual arguments.
    //
    // The length check is required: `Math.min()` with no arguments returns
    // Infinity, which would then be passed to `fils()` and throw.
    startingPrice: prices.length > 0 ? fils(Math.min(...prices)) : null,
    hasOffer: active.some((p) => p.offerPrice !== null),
    photos: g.photos,
    amenities: g.amenities,
    // Renaming as we go: the table stores flat `latitude`/`longitude`, the
    // domain wants a nested `{ lat, lng }`.
    location: { lat: g.latitude, lng: g.longitude },
    openNow: g.openNow,
  };
}

// An arrow function assigned to a const — same thing as `function toPlan(p)`,
// just a different style. This codebase uses the arrow form for short
// one-expression mappers and the `function` keyword for anything longer.
//
// Note the `({ ... })` wrapping parentheses: without them JavaScript would
// read `{` as a function body rather than an object to return.
const toPlan = (p: PlanRow): MembershipPlan => ({
  id: p.id,
  gymId: p.gymId,
  name: { ar: p.nameAr, en: p.nameEn },
  duration: p.duration as MembershipPlan["duration"],
  // Plain integers from the database become branded `Fils`. `fils()` validates
  // as it converts, so a fractional price would throw here rather than produce
  // a wrong total three screens later.
  listPrice: fils(p.listPrice),
  // Note the explicit `=== null` check rather than `p.offerPrice ? ... : ...`.
  // A price of 0 is falsy, so the shorter version would turn a genuine free
  // plan into "no offer".
  offerPrice: p.offerPrice === null ? null : fils(p.offerPrice),
});

// The same union-rebuilding job as toVerification, for memberships.
function toStatus(m: MembershipRow): Membership["status"] {
  switch (m.state) {
    case "active":
      return { state: "active", startsOn: iso(m.startsOn), endsOn: iso(m.endsOn) };
    case "frozen":
      // `resumesOn` keeps its null rather than becoming "" — the domain type
      // allows null here, because freezing indefinitely is a real state.
      return {
        state: "frozen",
        frozenAt: iso(m.frozenAt),
        resumesOn: m.resumesOn === null ? null : m.resumesOn.toISOString(),
      };
    case "expired":
      return { state: "expired", endedOn: iso(m.endedOn) };
    case "cancelled":
      return {
        state: "cancelled",
        cancelledAt: iso(m.cancelledAt),
        refund: m.refundAmount === null ? null : fils(m.refundAmount),
      };
    case "pending_payment":
      return { state: "pending_payment" };
    default:
      throw new Error(`Unknown membership state: ${m.state}`);
  }
}

const toMembership = (m: MembershipRow): Membership => ({
  id: m.id,
  userId: m.userId,
  gymId: m.gymId,
  planId: m.planId,
  status: toStatus(m),
  pricePaid: fils(m.pricePaid),
  checkInToken: m.checkInToken,
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. QUERIES
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────── gyms

/**
 * Every gym, ordered by name so the list does not shuffle between visits.
 *
 * Postgres returns rows in no guaranteed order unless you ask for one. Without
 * `orderBy` a page could genuinely show gyms in a different order on refresh,
 * which looks like a bug even though nothing is wrong.
 */
export async function getGyms(): Promise<readonly GymDetail[]> {
  const rows = await prisma.gym.findMany({
    include: withPlans,
    orderBy: { nameEn: "asc" },
  });
  return rows.map(toGym);
}

// `findUnique` is for columns the database knows are unique — the primary key,
// or anything marked `@unique` in the schema. It returns one row or `null`,
// never a list, and that is a promise the type system can rely on.
//
// The codebase uses `null` to mean "looked and found nothing", reserving
// `undefined` for "never set". Prisma returns null here, which matches.
export async function findGymBySlug(slug: string): Promise<GymDetail | null> {
  const g = await prisma.gym.findUnique({ where: { slug }, include: withPlans });
  return g ? toGym(g) : null;
}

export async function findGymById(id: string): Promise<GymDetail | null> {
  const g = await prisma.gym.findUnique({ where: { id }, include: withPlans });
  return g ? toGym(g) : null;
}

// ────────────────────────────────────────────────────────────────────── plans

// The sorting now happens in Postgres rather than in JavaScript. That is not
// just tidier: the database can use an index to sort, and it never has to send
// rows you were going to throw away.
export async function plansForGym(gymId: string): Promise<readonly MembershipPlan[]> {
  const rows = await prisma.membershipPlan.findMany({
    where: { gymId, active: true },
    orderBy: { listPrice: "asc" },
  });
  return rows.map(toPlan);
}

export async function findPlan(id: string): Promise<MembershipPlan | null> {
  const p = await prisma.membershipPlan.findUnique({ where: { id } });
  return p ? toPlan(p) : null;
}

// Returns two related things at once, so the checkout page needs one call
// rather than two — and cannot end up with a plan whose gym is missing.
//
// This is a JOIN, and `include` is how Prisma writes one. The gym's own plans
// come along too, because `toGym` needs them to work out a starting price.
export async function findPlanWithGym(
  id: string,
): Promise<{ plan: MembershipPlan; gym: GymDetail } | null> {
  const p = await prisma.membershipPlan.findUnique({
    where: { id },
    include: { gym: { include: withPlans } },
  });
  // GUARD CLAUSE: return early on failure rather than nesting the happy path
  // inside an `if`. Keeps the successful case at the outer indentation level.
  if (!p) return null;
  return { plan: toPlan(p), gym: toGym(p.gym) };
}

// ────────────────────────────────────────────────────────────────────── users

// ── A security pattern worth understanding properly ──
//
// TWO types for one user, differing only in the password fields:
//
//   DemoUser    — safe to send to a page. Exported.
//   StoredUser  — includes the hash and salt. NOT exported.
//
// Because `StoredUser` is not exported, no other file can even name that type,
// let alone hold one. The only way out of this module is through
// `publicUser()`, which drops the secrets. The type system enforces the rule
// that would otherwise depend on everyone remembering it.
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
// Note this rebuilds the object field by field rather than using
// `const { passwordHash, passwordSalt, ...rest } = u`. Deliberate: an
// ALLOWLIST. If someone adds a new secret column to the table, the
// destructuring version would leak it automatically, while this version simply
// ignores it. When it comes to secrets, list what may pass rather than what
// may not.
const publicUser = (u: {
  id: string;
  username: string;
  phone: string | null;
  name: string;
  role: string;
  locale: string;
}): DemoUser => ({
  id: u.id,
  username: u.username,
  phone: u.phone,
  name: u.name,
  role: u.role,
  locale: u.locale,
});

// `select` rather than `include`: it names exactly which columns come back, so
// the password hash never leaves Postgres in the first place. `publicUser`
// above is the second lock on the same door — one at the query, one at the
// boundary of this module.
const publicColumns = {
  id: true,
  username: true,
  phone: true,
  name: true,
  role: true,
  locale: true,
} as const;

export async function findUserById(id: string): Promise<DemoUser | null> {
  const u = await prisma.user.findUnique({ where: { id }, select: publicColumns });
  return u ? publicUser(u) : null;
}

/**
 * Looks up an account by username OR phone number, for the login form.
 *
 * Returns the STORED user, hash included, so only the sign-in action can call
 * it. Everything else uses findUserById, which cannot leak a hash.
 */
export async function findUserForLogin(identifier: string): Promise<StoredUser | null> {
  const needle = identifier.trim();

  // Username first, so a username that happens to look like a phone number
  // resolves as a username.
  //
  // `mode: "insensitive"` asks Postgres to compare without regard to case, so
  // "Emad" and "emad" are the same account. Doing it in the database rather
  // than lowercasing both sides in JavaScript matters here: the app no longer
  // holds every user in memory to search through.
  const byUsername = await prisma.user.findFirst({
    where: { username: { equals: needle, mode: "insensitive" } },
  });
  if (byUsername) return byUsername;

  // The phone is compared exactly, not case-insensitively — it was already
  // normalised to +965XXXXXXXX by the caller before reaching here.
  return prisma.user.findFirst({ where: { phone: needle } });
}

// ──────────────────────────────────────────────────────────────── memberships

// A VIEW MODEL: a membership plus the two names needed to display it. The
// membership itself only stores ids, and a list showing "gym_3" would be
// useless — so the names are resolved here, once, rather than in the page.
export interface MembershipListItem {
  readonly membership: Membership;
  readonly gymName: { readonly ar: string; readonly en: string };
  readonly planName: { readonly ar: string; readonly en: string };
}

export async function membershipsForUser(userId: string): Promise<readonly Membership[]> {
  const rows = await prisma.membership.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toMembership);
}

export async function membershipsWithDetailsForUser(
  userId: string,
): Promise<readonly MembershipListItem[]> {
  // The join that used to be a `.find` per row. One query now, and Postgres
  // does the matching with an index instead of JavaScript scanning an array.
  //
  // There is also no "skip rows whose gym is missing" step any more. A foreign
  // key makes a dangling id impossible: Postgres would have refused to store
  // the membership in the first place.
  const rows = await prisma.membership.findMany({
    where: { userId },
    include: { gym: true, plan: true },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((m) => ({
    membership: toMembership(m),
    gymName: { ar: m.gym.nameAr, en: m.gym.nameEn },
    planName: { ar: m.plan.nameAr, en: m.plan.nameEn },
  }));
}

/** Scoped by owner, so one user cannot read another's QR entry code. */
// SECURITY: note that `userId` is part of the `where`, not a check afterwards.
// Fetching by id and checking ownership later is the classic mistake (an
// "insecure direct object reference"). This shape makes forgetting the check
// impossible, because the userId is a required argument.
//
// `findFirst` rather than `findUnique` because the pair (id, userId) is not
// declared unique in the schema — only `id` is. Same result, and it lets the
// ownership condition sit in the query where it belongs.
export async function findMembershipForUser(
  id: string,
  userId: string,
): Promise<Membership | null> {
  const m = await prisma.membership.findFirst({ where: { id, userId } });
  return m ? toMembership(m) : null;
}

export async function findMembershipForGym(gymId: string): Promise<Membership | null> {
  const m = await prisma.membership.findFirst({ where: { gymId } });
  return m ? toMembership(m) : null;
}

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
 * `select` lists the public columns and then asks for the memberships as well,
 * so the password hash is never fetched. That is the safest kind of
 * protection: the secret does not travel.
 */
export async function adminUsers(): Promise<readonly AdminUserRow[]> {
  const rows = await prisma.user.findMany({
    select: {
      ...publicColumns,
      memberships: { select: { state: true, pricePaid: true } },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((u) => ({
    user: publicUser(u),
    membershipCount: u.memberships.length,
    // Filter then count. `.filter(...).length` is the idiomatic "count where"
    // in JavaScript — there is no dedicated count method.
    activeCount: u.memberships.filter((m) => m.state === "active").length,
    // `.reduce` to sum. The `0` is the starting value, and is required —
    // without it, reduce on an empty array throws.
    totalPaid: u.memberships.reduce((sum, m) => sum + m.pricePaid, 0),
  }));
}

export interface AdminGymRow {
  readonly gym: GymDetail;
  readonly planCount: number;
  readonly memberCount: number;
  /** Fils. Gross taken through this gym, across all its memberships. */
  readonly grossRevenue: number;
}

export async function adminGyms(): Promise<readonly AdminGymRow[]> {
  const rows = await prisma.gym.findMany({
    include: {
      plans: true,
      memberships: { select: { state: true, pricePaid: true } },
    },
    orderBy: { nameEn: "asc" },
  });

  return rows.map((g) => ({
    gym: toGym(g),
    planCount: g.plans.filter((p) => p.active).length,
    memberCount: g.memberships.filter((m) => m.state === "active").length,
    grossRevenue: g.memberships.reduce((sum, m) => sum + m.pricePaid, 0),
  }));
}

// ──────────────────────────────────────────── admin: the whole platform
//
// A gym sees only its own rows; admin sees every gym's. These are the same
// shapes as the gym-dashboard queries with the gymId filter removed and the
// gym's name added, since without it a cross-gym table is unreadable.

export interface AdminOverview {
  readonly gyms: number;
  readonly verifiedGyms: number;
  readonly users: number;
  readonly members: number;
  readonly memberships: number;
  readonly activeMemberships: number;
  /** Fils. Everything taken, before the commission split. */
  readonly grossRevenue: number;
  /** Fils. The platform's share. */
  readonly platformRevenue: number;
  /** Fils. What the gyms keep. */
  readonly gymRevenue: number;
  readonly checkIns: number;
}

export async function adminOverview(): Promise<AdminOverview> {
  // ── Promise.all ──
  // Each of these is an independent round trip to Postgres. Awaiting them one
  // after another would take the sum of all nine waits. `Promise.all` starts
  // them together and waits for the slowest, so the page costs one wait rather
  // than nine.
  //
  // It only works because none of them needs another's answer. Where a query
  // depends on an earlier result, it has to wait its turn.
  const [
    gyms,
    verifiedGyms,
    users,
    members,
    memberships,
    activeMemberships,
    money,
    checkIns,
  ] = await Promise.all([
    prisma.gym.count(),
    prisma.gym.count({ where: { verification: "verified" } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "member" } }),
    prisma.membership.count(),
    prisma.membership.count({ where: { state: "active" } }),
    // `aggregate` adds the columns up inside Postgres. The alternative — fetch
    // every payment and sum in JavaScript — sends the whole table over the
    // network to compute three numbers.
    //
    // Refunded payments are excluded rather than netted off: a refund is not
    // revenue that shrank, it is revenue that never happened.
    prisma.payment.aggregate({
      where: { status: "paid" },
      _sum: { amount: true, platformFee: true, gymAmount: true },
    }),
    prisma.checkIn.count(),
  ]);

  return {
    gyms,
    verifiedGyms,
    users,
    members,
    memberships,
    activeMemberships,
    // `?? 0` because SUM over zero rows is NULL in SQL, not 0. A database with
    // no payments yet would otherwise put `null` on the dashboard.
    grossRevenue: money._sum.amount ?? 0,
    platformRevenue: money._sum.platformFee ?? 0,
    gymRevenue: money._sum.gymAmount ?? 0,
    checkIns,
  };
}

export interface AdminMembershipRow {
  readonly membership: Membership;
  readonly memberName: string;
  readonly gymName: { readonly ar: string; readonly en: string };
  readonly gymSlug: string;
  readonly planName: { readonly ar: string; readonly en: string };
}

/** Every membership on the platform, largest payment first. */
export async function adminMemberships(): Promise<readonly AdminMembershipRow[]> {
  // A three-way join — user, gym and plan — in one query.
  const rows = await prisma.membership.findMany({
    include: { user: true, gym: true, plan: true },
    orderBy: { pricePaid: "desc" },
  });

  return rows.map((m) => ({
    membership: toMembership(m),
    memberName: m.user.name,
    gymName: { ar: m.gym.nameAr, en: m.gym.nameEn },
    gymSlug: m.gym.slug,
    planName: { ar: m.plan.nameAr, en: m.plan.nameEn },
  }));
}

export interface AdminCheckInRow {
  readonly id: string;
  readonly scannedAt: string;
  readonly memberName: string;
  readonly gymName: { readonly ar: string; readonly en: string };
}

/** Every scan across every gym, newest first. Capped for the same reason the
 *  gym's own log is: this table grows without bound. */
// `limit = 100` is a default parameter, so `adminCheckIns()` works unchanged.
//
// `orderBy` + `take` is the database doing what the old code did with
// `.slice(-limit).reverse()`. The difference is where the work happens: this
// version never loads the other rows at all.
export async function adminCheckIns(limit = 100): Promise<readonly AdminCheckInRow[]> {
  const rows = await prisma.checkIn.findMany({
    include: { user: true, gym: true },
    orderBy: { scannedAt: "desc" },
    take: limit,
  });

  return rows.map((c) => ({
    id: c.id,
    scannedAt: c.scannedAt.toISOString(),
    memberName: c.user.name,
    gymName: { ar: c.gym.nameAr, en: c.gym.nameEn },
  }));
}

export interface AdminPaymentRow {
  readonly id: string;
  readonly paidAt: string;
  /** All fils. */
  readonly amount: number;
  readonly platformFee: number;
  readonly gymAmount: number;
  readonly commissionBps: number;
  readonly method: string;
  readonly status: string;
  readonly memberName: string;
  readonly gymName: { readonly ar: string; readonly en: string };
}

/** Every payment, newest first — the platform's commission ledger. */
export async function adminPayments(): Promise<readonly AdminPaymentRow[]> {
  // A payment points at a membership, which points at a user and a gym — so
  // this reaches both THROUGH the membership. Nesting `include` inside
  // `include` is how you follow a chain of relations in one query.
  const rows = await prisma.payment.findMany({
    include: { membership: { include: { user: true, gym: true } } },
    // `nulls: "last"` because a payment that has not been paid has no paidAt,
    // and in Postgres a NULL sorts first in descending order. Without this,
    // unpaid rows would head the ledger.
    orderBy: { paidAt: { sort: "desc", nulls: "last" } },
  });

  return rows.map((p) => ({
    id: p.id,
    paidAt: iso(p.paidAt),
    amount: p.amount,
    platformFee: p.platformFee,
    gymAmount: p.gymAmount,
    commissionBps: p.commissionBps,
    method: p.method ?? "",
    status: p.status,
    memberName: p.membership.user.name,
    gymName: { ar: p.membership.gym.nameAr, en: p.membership.gym.nameEn },
  }));
}

// ─────────────────────────────────────────────────── gym dashboard: members

export interface GymMemberRow {
  readonly membership: Membership;
  readonly member: DemoUser;
  readonly planName: { readonly ar: string; readonly en: string };
  readonly checkInCount: number;
  /** ISO timestamp of the most recent scan, or null if they never came in. */
  readonly lastCheckIn: string | null;
}

/**
 * Everyone who has ever bought a membership at this gym.
 *
 * Every state is included, not just active. A gym chasing a lapsed member
 * needs to see them, and a list that silently hides expired rows makes the
 * member count look wrong to whoever is reading it.
 *
 * Sorted by state first — the people who can walk in today at the top — then
 * by who is expiring soonest, which is the gym's actual renewal worklist.
 */
export async function membersForGym(gymId: string): Promise<readonly GymMemberRow[]> {
  const rows = await prisma.membership.findMany({
    where: { gymId },
    include: {
      user: { select: publicColumns },
      plan: true,
      // `_count` asks Postgres to count the related rows without sending them.
      // A member with four hundred scans costs the same as one with two.
      _count: { select: { checkIns: true } },
      // Just the newest scan: sort descending, take one. Prisma runs this per
      // membership, which is fine at one row each.
      checkIns: { orderBy: { scannedAt: "desc" }, take: 1, select: { scannedAt: true } },
    },
  });

  // A lookup table turning each state into a sort position. Far clearer than a
  // chain of if/else inside the comparator, and the intended order is readable
  // at a glance.
  //
  // This sort stays in JavaScript rather than moving into `orderBy`, because
  // it is not a column order: "active, then frozen, then pending" is a rule of
  // ours, and the second level compares a date that only exists on some rows.
  const rank: Record<string, number> = {
    active: 0,
    frozen: 1,
    pending_payment: 2,
    expired: 3,
    cancelled: 4,
  };

  return rows
    .map((m) => ({
      membership: toMembership(m),
      member: publicUser(m.user),
      planName: { ar: m.plan.nameAr, en: m.plan.nameEn },
      checkInCount: m._count.checkIns,
      // `[0]?.scannedAt` — optional chaining then a fallback. Reads as "the
      // scannedAt if there is a scan at all, otherwise null".
      lastCheckIn: m.checkIns[0]?.scannedAt.toISOString() ?? null,
    }))
    // ── A multi-level sort ──
    // A comparator returns a negative number if `a` comes first, positive if
    // `b` does, and zero if they tie. To sort by several keys you check them in
    // order and only fall through to the next when the previous ties.
    .sort((a, b) => {
      // Level 1: by state, using the rank table. `?? 9` parks any unknown state
      // at the bottom instead of producing NaN, which would make the whole sort
      // behave unpredictably.
      const byState =
        (rank[a.membership.status.state] ?? 9) - (rank[b.membership.status.state] ?? 9);
      if (byState !== 0) return byState;

      // Within active, soonest expiry first — that is the renewal queue.
      //
      // The `.state === "active"` checks are narrowing, not defensive padding:
      // `endsOn` only exists on the active branch of the union, so the compiler
      // will not let it be read without them.
      const endA =
        a.membership.status.state === "active" ? a.membership.status.endsOn : "";
      const endB =
        b.membership.status.state === "active" ? b.membership.status.endsOn : "";
      if (endA && endB) return endA.localeCompare(endB);

      // Level 3, the tie-breaker: alphabetical by name. The "ar" argument sorts
      // using Arabic alphabetical rules rather than raw character codes, which
      // is what puts Arabic names in the order a reader expects.
      return a.member.name.localeCompare(b.member.name, "ar");
    });
}

// ────────────────────────────────────────────────── gym dashboard: check-ins

export interface CheckInRow {
  readonly id: string;
  readonly scannedAt: string;
  readonly memberName: string;
  readonly planName: { readonly ar: string; readonly en: string };
  /** The QR token that opened the door — what a dispute would be traced by. */
  readonly checkInToken: string;
}

export interface CheckInSummary {
  readonly today: number;
  readonly last7: number;
  readonly last30: number;
  /** Distinct members seen in the last 30 days. */
  readonly uniqueMembers30: number;
}

/**
 * The check-in log, newest first.
 *
 * `limit` exists because this table grows without bound — a busy gym scans a
 * few hundred a week, and rendering all of them would be the first page in the
 * app to get genuinely slow.
 */
export async function checkInsForGym(
  gymId: string,
  limit = 100,
): Promise<readonly CheckInRow[]> {
  const rows = await prisma.checkIn.findMany({
    where: { gymId },
    include: {
      user: { select: { name: true } },
      membership: { include: { plan: true } },
    },
    orderBy: { scannedAt: "desc" },
    take: limit,
  });

  return rows.map((c) => ({
    id: c.id,
    scannedAt: c.scannedAt.toISOString(),
    memberName: c.user.name,
    planName: { ar: c.membership.plan.nameAr, en: c.membership.plan.nameEn },
    checkInToken: c.membership.checkInToken,
  }));
}

/**
 * Counts for the tiles above the log.
 *
 * Measured against the real clock, so on a stale demo dataset these read
 * zero — which is correct, and better than inventing a window that makes old
 * data look current.
 */
// `now = new Date()` as a default parameter is a small but valuable design
// choice: production calls `checkInSummaryForGym(id)` and gets the real clock,
// while a test can pass a fixed date and get a repeatable answer. Injecting
// time like this is what makes time-dependent code testable.
export async function checkInSummaryForGym(
  gymId: string,
  now = new Date(),
): Promise<CheckInSummary> {
  const day = 86_400_000; // 24 × 60 × 60 × 1000
  const since = (ms: number) => new Date(now.getTime() - ms);

  // `new Date(now)` COPIES the date, because `.setHours` below mutates — Date
  // objects are mutable, and modifying the caller's argument would be a nasty
  // surprise. A frequent source of bugs in JavaScript date code.
  const startOfToday = new Date(now);
  // Zeroes the time portion, leaving midnight this morning.
  startOfToday.setHours(0, 0, 0, 0);

  // One query for the whole 30-day window, then all four numbers are counted
  // from it in memory. Four separate `count` queries would be four round trips
  // to compute answers that all live inside this one set of rows.
  //
  // `select` keeps it to the two columns actually needed, so a month of scans
  // is a small amount of data even for a busy gym.
  const recent = await prisma.checkIn.findMany({
    where: { gymId, scannedAt: { gte: since(30 * day) } },
    select: { scannedAt: true, userId: true },
  });

  const after = (from: Date) => recent.filter((c) => c.scannedAt >= from).length;

  return {
    today: after(startOfToday),
    last7: after(since(7 * day)),
    last30: recent.length,
    // ── Counting distinct values ──
    // `new Set(array)` discards duplicates, and `.size` is its length (not
    // `.length` — that is arrays only). So this counts distinct userIds: the
    // number of PEOPLE, not the number of visits.
    uniqueMembers30: new Set(recent.map((c) => c.userId)).size,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. WRITES
//
// These used to edit an array in memory and then try to write a JSON file
// back — which worked on a laptop and silently failed on Vercel, where the
// filesystem is read-only. That is why the editor screens had to warn that a
// change might not survive a restart.
//
// With a real database that whole problem is gone. A write is a write.
// ═══════════════════════════════════════════════════════════════════════════

// The shape a form submits. Flat (`nameAr`, `nameEn`) rather than nested,
// because HTML form fields are flat — see GymProfileForm.tsx, where each of
// these matches an input's `name` attribute.
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

/**
 * Saves the gym's profile. Returns false when there is no gym with that slug.
 *
 * The `try`/`catch` is narrow on purpose: it turns Prisma's "record not found"
 * into a plain `false`, and lets every other error — a lost connection, a
 * constraint violation — travel up to be seen. Swallowing those would leave a
 * form cheerfully reporting success on a save that never happened.
 */
export async function updateGymProfile(
  slug: string,
  input: GymProfileInput,
): Promise<boolean> {
  try {
    await prisma.gym.update({
      where: { slug },
      data: {
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        descriptionAr: input.descriptionAr,
        descriptionEn: input.descriptionEn,
        areaAr: input.areaAr,
        areaEn: input.areaEn,
        addressAr: input.addressAr,
        addressEn: input.addressEn,
        hoursAr: input.hoursAr,
        hoursEn: input.hoursEn,
        // These two are database enums. The values come from a <select> whose
        // options the server rendered, so they are already one of the allowed
        // strings — and if they somehow were not, Postgres rejects the write
        // rather than storing nonsense.
        governorate: input.governorate as GymRow["governorate"],
        access: input.access as GymRow["access"],
        // `[...input.amenities]` spreads into a NEW array, because Prisma wants
        // a mutable array and the input is declared readonly.
        amenities: [...input.amenities],
      },
    });
    return true;
  } catch {
    return false;
  }
}

export interface PlanInput {
  readonly nameAr: string;
  readonly nameEn: string;
  /** Fils. Converted from the human-written KWD by parseKwd in the action. */
  readonly listPrice: number;
  readonly offerPrice: number | null;
  readonly active: boolean;
}

/** Saves a plan. Returns false when there is no plan with that id. */
export async function updatePlan(id: string, input: PlanInput): Promise<boolean> {
  try {
    await prisma.membershipPlan.update({
      where: { id },
      data: {
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        listPrice: input.listPrice,
        offerPrice: input.offerPrice,
        active: input.active,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** Every plan for a gym, including inactive ones — the editor must see those. */
// Compare with `plansForGym` above, which filters to active only. Two
// functions rather than a boolean flag: the caller states which it wants by
// picking a name, and neither call site can pass the wrong thing by accident.
export async function allPlansForGym(gymId: string): Promise<readonly MembershipPlan[]> {
  const rows = await prisma.membershipPlan.findMany({
    where: { gymId },
    orderBy: { listPrice: "asc" },
  });
  return rows.map(toPlan);
}

/**
 * The ids of the gym's plans that are currently on sale.
 *
 * This replaced an `isPlanActive(id)` that answered for one plan at a time.
 * Reading one row per plan was harmless when the data was an array in memory;
 * against a database it is one network round trip per plan, which is the
 * classic "N+1 query" — the single most common way a page gets slow after a
 * move like this one. Asking once and looking the answers up in a Set costs
 * one query no matter how many plans a gym has.
 *
 * `select: { id: true }` fetches just the ids, since that is all a Set needs.
 */
export async function activePlanIdsForGym(gymId: string): Promise<ReadonlySet<string>> {
  const rows = await prisma.membershipPlan.findMany({
    where: { gymId, active: true },
    select: { id: true },
  });
  return new Set(rows.map((p) => p.id));
}

/** The gym a staff member or owner belongs to. */
// One query, following the relation from the user straight to the gym. The
// `staffAtGym` field is null for an ordinary member, which is exactly the
// answer this function should give for one.
export async function gymForStaff(userId: string): Promise<GymDetail | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { staffAtGym: { include: withPlans } },
  });
  return u?.staffAtGym ? toGym(u.staffAtGym) : null;
}
