import { fils } from "@fg/core";
import type { Gym, Membership, MembershipPlan } from "@fg/core";

// ── Importing JSON as if it were code ──
// TypeScript and the Next.js bundler let you `import` a .json file directly.
// The file's contents become a plain JavaScript object, and TypeScript infers
// its type from the actual data on disk. No parsing, no `fs.readFile`.
//
// The `@/` prefix is a PATH ALIAS defined in apps/web/tsconfig.json: it means
// "from apps/web/src/". So `@/db/gyms.json` is apps/web/db/gyms.json. The
// point of aliases is to avoid brittle relative paths like `../../../db/`.
import gymsJson from "@/db/gyms.json";
import plansJson from "@/db/plans.json";
import usersJson from "@/db/users.json";
import membershipsJson from "@/db/memberships.json";
import checkInsJson from "@/db/checkins.json";
import paymentsJson from "@/db/payments.json";

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

// ═══════════════════════════════════════════════════════════════════════════
// THE SHAPE OF THIS FILE — read this before the code
//
// It is organised in three layers, top to bottom:
//
//   1. MAPPERS   (toGym, toPlan, toMembership …)
//      Convert a raw JSON row into a clean domain type from @fg/core. This is
//      where loose data becomes trustworthy data.
//
//   2. QUERIES   (getGyms, findGymBySlug, membersForGym …)
//      Read from the arrays and return mapped results. These are what the
//      pages actually call. Think of each as a hand-written SQL query.
//
//   3. WRITES    (updateGymProfile, updatePlan, persist)
//      Mutate the in-memory arrays and try to save them back to disk.
//
// The whole file runs on the SERVER only. Pages import these functions and
// call them during rendering; the browser never sees this code or the JSON.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mutable working copies. structuredClone because the imported JSON is shared
 * module state — mutating it directly would corrupt the pristine import.
 */
// ── Why a copy is essential ──
// An imported module is a SINGLETON: every file that imports gyms.json gets
// the exact same object in memory, not a fresh one. Mutating it would change
// what everyone else sees, and in dev the change would persist across
// requests in confusing ways.
//
// `structuredClone` is a built-in that makes a DEEP copy — nested objects and
// arrays are duplicated too. Compare with `{...obj}` or `.slice()`, which are
// SHALLOW: they copy the top level only, so nested objects stay shared. For
// nested data like this, a shallow copy would silently fail to protect you.
//
// Only gyms and plans are cloned because only those two are ever edited. The
// rest are read-only, so sharing the import is safe.
const gyms: RawGym[] = structuredClone(gymsJson);
const plans: RawPlan[] = structuredClone(plansJson);

// `extends` on an interface means "everything Gym has, plus what follows".
// Inheritance for shapes — much like C# interface inheritance.
//
// These four extra fields exist in the JSON but not in the core `Gym` type,
// because they are presentation details rather than domain facts. Keeping
// them here rather than in @fg/core stops the shared domain model filling up
// with things only the web app cares about.
export interface GymDetail extends Gym {
  readonly slug: string; // the URL-friendly id, e.g. "iron-club"
  readonly hours: { readonly ar: string; readonly en: string };
  readonly address: { readonly ar: string; readonly en: string };
  readonly openNow: boolean;
}

// The JSON is typed loosely on import; these narrow it back to the domain.
//
// `(typeof gymsJson)[number]` again — same trick as `Locale` in
// packages/i18n/src/types.ts. `gymsJson` is an ARRAY, so indexing its type
// with `number` gives the type of ONE element. Derived from the real file, so
// editing gyms.json updates this type automatically.
type RawGym = (typeof gymsJson)[number];
type RawPlan = (typeof plansJson)[number];
type RawMembership = (typeof membershipsJson)[number];

/** Rebuilds the verification union from the flat stored value. */
// ── Why this mapper exists ──
// JSON cannot express a discriminated union, so the file stores a flat
// `"verification": "verified"` plus loose sibling fields. The domain type
// (see packages/core/src/domain/gym.ts) wants the structured version where
// each state carries exactly its own data. This function is the translation.
//
// `Gym["verification"]` is an INDEXED ACCESS TYPE: "the type of the
// `verification` field on `Gym`". Writing it this way rather than importing
// `VerificationStatus` means it tracks whatever `Gym` says, automatically.
function toVerification(g: RawGym): Gym["verification"] {
  // `switch` on a string. Same as C#, with one big caveat: without `break` or
  // `return`, execution FALLS THROUGH into the next case. Every branch here
  // returns, so it cannot bite — but it is the classic JavaScript switch bug.
  switch (g.verification) {
    case "verified":
      // `?? ""` because the JSON field is optional. The domain type requires
      // a string, so a missing date becomes empty rather than undefined.
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
      // Throwing rather than silently defaulting. A typo in the JSON is a
      // data bug that should surface immediately and loudly — returning
      // "unverified" here would hide it and quietly mis-badge a gym.
      throw new Error(`Unknown verification state: ${g.verification}`);
  }
}

function toGym(g: RawGym): GymDetail {
  // ── A three-step chain, read top to bottom ──
  //   .filter  keep only this gym's active plans
  //   .map     replace each plan with just its effective price
  // The result is an array of numbers, ready for Math.min below.
  //
  // `p.offerPrice ?? p.listPrice` — the offer price when there is one,
  // otherwise the normal price. This is the "effective price" rule, and it
  // appears wherever a price is shown.
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
    // `as Gym["governorate"]` is a cast. JSON gives a plain `string`, but the
    // domain wants the narrow union of six governorates. The cast asserts
    // they match — nothing verifies it at runtime, which is exactly the risk
    // the db/README.md warns about when hand-editing JSON.
    governorate: g.governorate as Gym["governorate"],
    access: g.access as Gym["access"],
    verification: toVerification(g),
    rating: g.rating,
    reviewCount: g.reviewCount,
    // `Math.min(...prices)` uses the SPREAD operator. Math.min takes separate
    // arguments — min(1, 2, 3) — not an array, so `...` unpacks the array
    // into individual arguments.
    //
    // The length check is required: `Math.min()` with no arguments returns
    // Infinity, which would then be passed to `fils()` and throw.
    startingPrice: prices.length > 0 ? fils(Math.min(...prices)) : null,
    photos: g.photos,
    amenities: g.amenities,
    // Renaming as we go: the JSON stores flat `latitude`/`longitude`, the
    // domain wants a nested `{ lat, lng }`.
    location: { lat: g.latitude, lng: g.longitude },
    openNow: g.openNow,
  };
}

// An arrow function assigned to a const — same thing as `function toPlan(p)`,
// just a different style. This codebase uses the arrow form for short
// one-expression mappers and the `function` keyword for anything longer.
//
// Note the `({ ... })` wrapping parentheses again: without them JavaScript
// would read `{` as a function body rather than an object to return.
const toPlan = (p: RawPlan): MembershipPlan => ({
  id: p.id,
  gymId: p.gymId,
  name: p.name,
  duration: p.duration as MembershipPlan["duration"],
  // Raw numbers from JSON become branded `Fils`. `fils()` validates as it
  // converts, so a fractional price in the JSON throws here rather than
  // producing a wrong total three screens later.
  listPrice: fils(p.listPrice),
  // Note the explicit `=== null` check rather than `p.offerPrice ? ... : ...`.
  // A price of 0 is falsy, so the shorter version would turn a genuine free
  // plan into "no offer".
  offerPrice: p.offerPrice === null ? null : fils(p.offerPrice),
});

// The same union-rebuilding job as toVerification, for memberships.
function toStatus(m: RawMembership): Membership["status"] {
  switch (m.state) {
    case "active":
      return { state: "active", startsOn: m.startsOn ?? "", endsOn: m.endsOn ?? "" };
    case "frozen":
      // No `?? null` on resumesOn — the domain type already allows null here,
      // because freezing indefinitely is a real state.
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

// The simplest possible query: map every row. `readonly GymDetail[]` promises
// callers they must not modify the returned array.
export const getGyms = (): readonly GymDetail[] => gyms.map(toGym);

// `.find(fn)` returns the FIRST element the callback approves, or `undefined`
// if none match. (Compare `.filter`, which returns every match as an array.)
//
// `g ? toGym(g) : null` converts undefined to null. Deliberate: this codebase
// uses `null` to mean "looked and found nothing", reserving `undefined` for
// "never set". Being consistent about which one you return saves callers from
// having to check both.
export const findGymBySlug = (slug: string): GymDetail | null => {
  const g = gyms.find((x) => x.slug === slug);
  return g ? toGym(g) : null;
};

export const findGymById = (id: string): GymDetail | null => {
  const g = gyms.find((x) => x.id === id);
  return g ? toGym(g) : null;
};

// ────────────────────────────────────────────────────────────────────── plans

// filter → sort → map. Order matters for both correctness and cost:
//
//   sort BEFORE map, because sorting on the raw `listPrice` number is
//   straightforward, whereas sorting mapped `Fils` would be the same work for
//   no benefit — and mapping first would convert rows that sorting keeps anyway.
//
// `.sort()` MUTATES the array it is called on. That is safe here only because
// `.filter()` just produced a fresh array. Calling `.sort()` directly on
// `plans` would permanently reorder the module-level data — a genuinely nasty
// bug, and a good reason to be wary of `.sort()` anywhere.
export const plansForGym = (gymId: string): readonly MembershipPlan[] =>
  plans
    .filter((p) => p.gymId === gymId && p.active)
    .sort((a, b) => a.listPrice - b.listPrice)
    .map(toPlan);

export const findPlan = (id: string): MembershipPlan | null => {
  const p = plans.find((x) => x.id === id);
  return p ? toPlan(p) : null;
};

// Returns two related things at once, so the checkout page needs one call
// rather than two — and cannot end up with a plan whose gym is missing.
export const findPlanWithGym = (
  id: string,
): { plan: MembershipPlan; gym: GymDetail } | null => {
  const p = plans.find((x) => x.id === id);
  // GUARD CLAUSES: return early on each failure rather than nesting the happy
  // path inside `if` blocks. Keeps the successful case at the outer
  // indentation level, which is much easier to follow.
  if (!p) return null;
  const g = gyms.find((x) => x.id === p.gymId);
  if (!g) return null;
  return { plan: toPlan(p), gym: toGym(g) };
};

// ────────────────────────────────────────────────────────────────────── users

// ── A security pattern worth understanding properly ──
//
// TWO types for one user, differing only in the password fields:
//
//   DemoUser    — safe to send to a page. Exported.
//   StoredUser  — includes the hash and salt. NOT exported.
//
// Because `StoredUser` is not exported, no other file can even name that
// type, let alone hold one. The only way out of this module is through
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
// ALLOWLIST. If someone adds a new secret field to the JSON, the destructuring
// version would leak it automatically, while this version simply ignores it.
// When it comes to secrets, list what may pass rather than what may not.
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
  // Usernames match case-insensitively; both sides are lowercased so "Emad"
  // and "emad" are the same account.
  const needle = identifier.trim().toLowerCase();
  // A chain of `??` reads as "try this, else this, else null". The first
  // non-null result wins and the rest are never evaluated.
  //
  // Username is tried first, so a username that looks like a phone number
  // resolves as a username. The final `?? null` converts `.find`'s
  // `undefined` into this codebase's `null` convention.
  return (
    usersJson.find((u) => u.username.toLowerCase() === needle) ??
    // The phone is compared raw, not lowercased — it was already normalised
    // to +965XXXXXXXX by the caller before reaching here.
    usersJson.find((u) => u.phone !== null && u.phone === identifier) ??
    null
  );
};

// ──────────────────────────────────────────────────────────────── memberships

// A VIEW MODEL: a membership plus the two names needed to display it. The
// membership itself only stores ids, and a list showing "gym_3" would be
// useless — so the names are resolved here, once, rather than in the page.
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
  return (
    membershipsJson
      .filter((m) => m.userId === userId)
      .map((m) => {
        // This is a JOIN, done by hand. A real database would express it as
        // `JOIN gyms ON ... JOIN plans ON ...`; with arrays in memory it is a
        // `.find` per row. Fine at this size, and the first thing to replace
        // when a real database arrives.
        const gym = gyms.find((g) => g.id === m.gymId);
        const plan = plans.find((p) => p.id === m.planId);
        // Skip rows whose gym or plan is missing — a dangling id in the JSON.
        // Returning null marks the row for removal by the filter below.
        if (!gym || !plan) return null;
        return {
          membership: toMembership(m),
          gymName: gym.name,
          planName: plan.name,
        };
      })
      // ── `(x): x is MembershipListItem => x !== null` ──
      //
      // This is the map-then-filter-nulls pattern, and the odd-looking
      // annotation is what makes it type-check.
      //
      // After `.map`, the array's type is `(MembershipListItem | null)[]`.
      // A plain `.filter(x => x !== null)` removes the nulls at RUNTIME, but
      // TypeScript is not clever enough to narrow the array's type — it would
      // still think nulls might be in there.
      //
      // Writing the callback as a TYPE PREDICATE (`x is MembershipListItem`,
      // the same feature as `isLocale` in packages/i18n/src/types.ts) tells the
      // compiler what the filter guarantees, so the result is correctly typed
      // as `MembershipListItem[]`.
      //
      // You will see this exact line five more times in this file.
      .filter((x): x is MembershipListItem => x !== null)
  );
}

/** Scoped by owner, so one user cannot read another's QR entry code. */
// SECURITY: note `x.id === id && x.userId === userId`. Both conditions, in
// one query. Fetching by id and checking ownership afterwards is the classic
// mistake (an "insecure direct object reference") — this shape makes
// forgetting the check impossible, because the userId is a required argument.
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
      // Filter then count. `.filter(...).length` is the idiomatic
      // "count where" in JavaScript — there is no dedicated count method.
      activeCount: mine.filter((m) => m.state === "active").length,
      // `.reduce` to sum. The `0` is the starting value, and is required —
      // without it, reduce on an empty array throws.
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

export function adminOverview(): AdminOverview {
  // Computed once and reused three times below. Filtering inside each of the
  // three reduces would do the same work three times over.
  const paid = paymentsJson.filter((p) => p.status === "paid");

  return {
    gyms: gyms.length,
    verifiedGyms: gyms.filter((g) => g.verification === "verified").length,
    users: usersJson.length,
    members: usersJson.filter((u) => u.role === "member").length,
    memberships: membershipsJson.length,
    activeMemberships: membershipsJson.filter((m) => m.state === "active").length,
    // Refunded payments are excluded rather than netted off: a refund is not
    // revenue that shrank, it is revenue that never happened.
    grossRevenue: paid.reduce((sum, p) => sum + p.amount, 0),
    platformRevenue: paid.reduce((sum, p) => sum + p.platformFee, 0),
    gymRevenue: paid.reduce((sum, p) => sum + p.gymAmount, 0),
    checkIns: checkInsJson.length,
  };
}

export interface AdminMembershipRow {
  readonly membership: Membership;
  readonly memberName: string;
  readonly gymName: { readonly ar: string; readonly en: string };
  readonly gymSlug: string;
  readonly planName: { readonly ar: string; readonly en: string };
}

/** Every membership on the platform, newest first by whatever date it has. */
export function adminMemberships(): readonly AdminMembershipRow[] {
  return (
    membershipsJson
      .map((m) => {
        // A three-way join this time: user, gym and plan.
        const u = usersJson.find((x) => x.id === m.userId);
        const gym = gyms.find((g) => g.id === m.gymId);
        const plan = plans.find((p) => p.id === m.planId);
        if (!u || !gym || !plan) return null;
        return {
          membership: toMembership(m),
          memberName: u.name,
          gymName: gym.name,
          gymSlug: gym.slug,
          planName: plan.name,
        };
      })
      .filter((x): x is AdminMembershipRow => x !== null)
      // `b - a` sorts DESCENDING (largest first); `a - b` would be ascending.
      // Worth memorising — it is easy to get backwards and easy to miss.
      .sort((a, b) => b.membership.pricePaid - a.membership.pricePaid)
  );
}

export interface AdminCheckInRow {
  readonly id: string;
  readonly scannedAt: string;
  readonly memberName: string;
  readonly gymName: { readonly ar: string; readonly en: string };
}

/** Every scan across every gym, newest first. Capped for the same reason
 *  the gym's own log is: this table grows without bound. */
// `limit = 100` is a default parameter, so `adminCheckIns()` works unchanged.
export function adminCheckIns(limit = 100): readonly AdminCheckInRow[] {
  return (
    checkInsJson
      // `.slice(-limit)` takes the LAST `limit` elements. A negative index
      // counts back from the end — `.slice(-3)` is the last three.
      .slice(-limit)
      // `.reverse()` flips the order so newest comes first. Note it MUTATES,
      // but `.slice()` above already made a copy, so the original is safe.
      .reverse()
      .map((c) => {
        const u = usersJson.find((x) => x.id === c.userId);
        const gym = gyms.find((g) => g.id === c.gymId);
        if (!u || !gym) return null;
        return {
          id: c.id,
          scannedAt: c.scannedAt,
          memberName: u.name,
          gymName: gym.name,
        };
      })
      .filter((x): x is AdminCheckInRow => x !== null)
  );
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
export function adminPayments(): readonly AdminPaymentRow[] {
  return (
    paymentsJson
      .map((p) => {
        // A payment points at a membership, which points at a user and a gym —
        // so this hops through the membership to reach both.
        const m = membershipsJson.find((x) => x.id === p.membershipId);
        // `m ? ... : undefined` guards the lookups: without the membership
        // there is nothing to search by, so the work is skipped entirely.
        const u = m ? usersJson.find((x) => x.id === m.userId) : undefined;
        const gym = m ? gyms.find((g) => g.id === m.gymId) : undefined;
        if (!m || !u || !gym) return null;
        return {
          id: p.id,
          paidAt: p.paidAt,
          amount: p.amount,
          platformFee: p.platformFee,
          gymAmount: p.gymAmount,
          commissionBps: p.commissionBps,
          method: p.method,
          status: p.status,
          memberName: u.name,
          gymName: gym.name,
        };
      })
      .filter((x): x is AdminPaymentRow => x !== null)
      // `.localeCompare` compares strings, returning the negative/zero/positive
      // that sort expects. `b.localeCompare(a)` is descending — newest first.
      // It works on these dates because ISO-8601 sorts correctly as text.
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
  );
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
export function membersForGym(gymId: string): readonly GymMemberRow[] {
  // A lookup table turning each state into a sort position. Far clearer than
  // a chain of if/else inside the comparator, and the intended order is
  // readable at a glance.
  const rank: Record<string, number> = {
    active: 0,
    frozen: 1,
    pending_payment: 2,
    expired: 3,
    cancelled: 4,
  };

  return (
    membershipsJson
      .filter((m) => m.gymId === gymId)
      .map((m) => {
        const u = usersJson.find((x) => x.id === m.userId);
        const plan = plans.find((p) => p.id === m.planId);
        if (!u || !plan) return null;

        const mine = checkInsJson.filter((c) => c.membershipId === m.id);
        // The array is written sorted ascending, so the last entry is the newest.
        // `mine[mine.length - 1]` is how you read the last element — JavaScript
        // has no `.last()`, and negative indexes do not work on arrays the way
        // they do in `.slice()`.
        const last = mine.length > 0 ? mine[mine.length - 1] : undefined;

        return {
          membership: toMembership(m),
          member: publicUser(u),
          planName: plan.name,
          checkInCount: mine.length,
          // `last?.scannedAt ?? null` — optional chaining then a fallback.
          // Reads as "the scannedAt if there is a last scan, otherwise null".
          lastCheckIn: last?.scannedAt ?? null,
        };
      })
      .filter((x): x is GymMemberRow => x !== null)
      // ── A multi-level sort ──
      // A comparator returns a negative number if `a` comes first, positive if
      // `b` does, and zero if they tie. To sort by several keys you check them
      // in order and only fall through to the next when the previous ties.
      .sort((a, b) => {
        // Level 1: by state, using the rank table. `?? 9` parks any unknown
        // state at the bottom instead of producing NaN, which would make the
        // whole sort behave unpredictably.
        const byState =
          (rank[a.membership.status.state] ?? 9) - (rank[b.membership.status.state] ?? 9);
        if (byState !== 0) return byState;

        // Within active, soonest expiry first — that is the renewal queue.
        //
        // The `.state === "active"` checks are narrowing, not defensive
        // padding: `endsOn` only exists on the active branch of the union, so
        // the compiler will not let it be read without them.
        const endA =
          a.membership.status.state === "active" ? a.membership.status.endsOn : "";
        const endB =
          b.membership.status.state === "active" ? b.membership.status.endsOn : "";
        if (endA && endB) return endA.localeCompare(endB);

        // Level 3, the tie-breaker: alphabetical by name. The "ar" argument
        // sorts using Arabic alphabetical rules rather than raw character
        // codes, which is what puts Arabic names in the order a reader expects.
        return a.member.name.localeCompare(b.member.name, "ar");
      })
  );
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
 * few hundred a week, and rendering all of them would be the first page in
 * the app to get genuinely slow.
 */
export function checkInsForGym(gymId: string, limit = 100): readonly CheckInRow[] {
  return checkInsJson
    .filter((c) => c.gymId === gymId)
    .slice(-limit)
    .reverse()
    .map((c) => {
      const u = usersJson.find((x) => x.id === c.userId);
      const m = membershipsJson.find((x) => x.id === c.membershipId);
      const plan = m ? plans.find((p) => p.id === m.planId) : undefined;
      if (!u || !m || !plan) return null;
      return {
        id: c.id,
        scannedAt: c.scannedAt,
        memberName: u.name,
        planName: plan.name,
        checkInToken: m.checkInToken,
      };
    })
    .filter((x): x is CheckInRow => x !== null);
}

/**
 * Counts for the tiles above the log.
 *
 * Measured against the real clock, so on a stale demo dataset these read
 * zero — which is correct, and better than inventing a window that makes
 * old data look current.
 */
// `now = new Date()` as a default parameter is a small but valuable design
// choice: production calls `checkInSummaryForGym(id)` and gets the real
// clock, while a test can pass a fixed date and get a repeatable answer.
// Injecting time like this is what makes time-dependent code testable.
export function checkInSummaryForGym(gymId: string, now = new Date()): CheckInSummary {
  const mine = checkInsJson.filter((c) => c.gymId === gymId);
  // `new Date(now)` COPIES the date, because `.setHours` below mutates —
  // Date objects are mutable, and modifying the caller's argument would be a
  // nasty surprise. A frequent source of bugs in JavaScript date code.
  const startOfToday = new Date(now);
  // Zeroes the time portion, leaving midnight this morning.
  startOfToday.setHours(0, 0, 0, 0);

  // A small helper closing over `now`: "the ISO timestamp this many
  // milliseconds ago". Defined inside the function because it is meaningless
  // outside it.
  const since = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const day = 86_400_000; // 24 × 60 × 60 × 1000

  // Computed once, used twice below.
  const in30 = mine.filter((c) => c.scannedAt >= since(30 * day));

  return {
    // Comparing ISO strings with `>=` works because ISO-8601 is designed to
    // sort chronologically as plain text. No date parsing needed.
    today: mine.filter((c) => c.scannedAt >= startOfToday.toISOString()).length,
    last7: mine.filter((c) => c.scannedAt >= since(7 * day)).length,
    last30: in30.length,
    // ── Counting distinct values ──
    // `new Set(array)` discards duplicates, and `.size` is its length (not
    // `.length` — that is arrays only). So this counts distinct userIds:
    // the number of PEOPLE, not the number of visits.
    uniqueMembers30: new Set(in30.map((c) => c.userId)).size,
  };
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
// ── `async` / `await` ──
// `async` marks a function that may pause. It always returns a PROMISE — a
// placeholder for a value that is not ready yet. `await` pauses until a
// promise settles and unwraps it. Very close to C#'s async/await.
//
// So `Promise<"file" | "memory">` reads as: eventually, one of those two
// strings. The return type doubles as documentation of what happened.
async function persist(file: string, data: unknown): Promise<"file" | "memory"> {
  try {
    // ── A DYNAMIC import — `await import(...)` inside a function ──
    // Unlike a normal top-level `import`, this only loads the module when
    // this line actually runs. That matters here: a static import of
    // `node:fs` would make the bundler try to include Node's filesystem in
    // any bundle that touches this file, which fails in the browser.
    // Deferring it keeps the dependency server-only.
    const { writeFile } = await import("node:fs/promises");
    const path = await import("node:path");
    await writeFile(
      // `process.cwd()` is the directory the server was started from
      // (apps/web). `path.join` assembles the path with the right separator
      // for the OS — never build paths with string concatenation.
      path.join(process.cwd(), "db", `${file}.json`),
      // `JSON.stringify(data, null, 2)` serialises with 2-space indentation.
      // The `null` is a replacer function nobody needs here. The trailing
      // "\n" keeps the file POSIX-clean and avoids a spurious diff line.
      JSON.stringify(data, null, 2) + "\n",
      "utf8",
    );
    return "file";
  } catch {
    // Read-only filesystem, or running from a bundle. Not an error here.
    //
    // Swallowing an exception is usually wrong. It is right here because the
    // failure is EXPECTED on Vercel and already handled: the in-memory data
    // is updated regardless, and the return value tells the caller which of
    // the two happened so the UI can say so honestly.
    return "memory";
  }
}

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

// Returns "file" (saved to disk), "memory" (in-memory only) or null (no such
// gym). Three outcomes in the type, so the caller must handle all three —
// which is why the editor screen can tell the user exactly what happened.
export async function updateGymProfile(
  slug: string,
  input: GymProfileInput,
): Promise<"file" | "memory" | null> {
  const gym = gyms.find((g) => g.slug === slug);
  if (!gym) return null;

  // MUTATION — the only place in this file that changes existing data, and
  // the reason `gyms` was structuredClone'd at the top. `gym` is a reference
  // INTO the `gyms` array, so assigning to its fields updates the array too.
  gym.name = { ar: input.nameAr, en: input.nameEn };
  gym.description = { ar: input.descriptionAr, en: input.descriptionEn };
  gym.area = { ar: input.areaAr, en: input.areaEn };
  gym.address = { ar: input.addressAr, en: input.addressEn };
  gym.hours = { ar: input.hoursAr, en: input.hoursEn };
  gym.governorate = input.governorate;
  gym.access = input.access;
  // `[...input.amenities]` spreads into a NEW array. Without the copy, the
  // stored data would alias the caller's array, and a later change there
  // would silently reach in and edit the database.
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
// Compare with `plansForGym` above, which filters to active only. Two
// functions rather than a boolean flag: the caller states which it wants by
// picking a name, and neither call site can pass the wrong thing by accident.
export const allPlansForGym = (gymId: string): readonly MembershipPlan[] =>
  plans
    .filter((p) => p.gymId === gymId)
    .sort((a, b) => a.listPrice - b.listPrice)
    .map(toPlan);

// `?.active ?? false` — if no plan is found, `?.` short-circuits to undefined
// and `??` turns that into false. A missing plan is not an active plan.
export const isPlanActive = (id: string): boolean =>
  plans.find((p) => p.id === id)?.active ?? false;

/** The gym a staff member or owner belongs to. */
export const gymForStaff = (userId: string): GymDetail | null => {
  const u = usersJson.find((x) => x.id === userId);
  // A cast is needed because only SOME user records carry `staffAtGymId`, so
  // TypeScript's inferred type for the array does not include it on every
  // row. `{ staffAtGymId?: string } | undefined` says "might have this field,
  // and might not exist at all", then `?.` handles both possibilities safely.
  const staffAtGymId = (u as { staffAtGymId?: string } | undefined)?.staffAtGymId;
  if (!staffAtGymId) return null;
  const g = gyms.find((x) => x.id === staffAtGymId);
  return g ? toGym(g) : null;
};
