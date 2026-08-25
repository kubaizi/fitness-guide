/**
 * Seeds a realistic Iron Club roster plus check-in history.
 *
 * Deterministic: a fixed-seed PRNG, so re-running produces byte-identical
 * files and a re-seed never shows up as a spurious diff.
 *
 * Run from the repo root:
 *   cd apps/web && node --experimental-strip-types ../../scripts/seed-demo-data.mjs
 *
 * Idempotent: existing accounts and memberships are left alone, and the
 * check-in log is regenerated from scratch each time.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { hashPassword } from "../packages/core/src/password.ts";
import { fils, splitCommission } from "../packages/core/src/money.ts";

const TODAY = new Date("2026-08-23T00:00:00.000Z");
// The seed is anchored to a fixed date so the file is reproducible. NOW is
// late enough in that day that the newest check-ins land on it, rather than
// leaving "today" empty on a screen whose whole point is today's traffic.
const NOW = new Date("2026-08-23T21:00:00.000Z");
const IRON = "cmsrdn5ac0001f8ftcmmjp9y0";
const NAWA = "cmsrdn5am0009f8ftzliyvz7q";
const GULF = "cmsrdn5av000ff8ftkjlqgw48";

const PLAN = {
  ironDay: "cmsrdn5af0005f8ftnsbp39yi",
  ironMonthly: "cmsrdn5af0006f8ftcdvzkp70",
  ironQuarterly: "cmsrdn5af0007f8ft2l75jrq9",
  ironYearly: "cmsrdn5af0008f8ftwf24d76x",
  nawaMonthly: "cmsrdn5ao000df8ftt6htuq28",
  gulfMonthly: "cmsrdn5aw000jf8ftuyglyz6l",
};

/** mulberry32 — small, fast, and identical on every machine. */
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (d) => new Date(d).toISOString();
const daysAgo = (n) => new Date(TODAY.getTime() - n * 86400000);
const daysAhead = (n) => new Date(TODAY.getTime() + n * 86400000);

// Iron Club is men-only and Nawa Studio is women-only, so the rosters are
// gendered accordingly — a women's name at Iron Club would be a data bug
// a Kuwaiti reviewer would spot immediately.
const NEW_MEMBERS = [
  { u: "yousef", name: "يوسف العنزي", phone: "+96555010203" },
  { u: "bader", name: "بدر المطيري", phone: "+96555020304" },
  { u: "khaled", name: "خالد الرشيدي", phone: "+96555030405" },
  { u: "faisal", name: "فيصل العجمي", phone: "+96555040506" },
  { u: "nasser", name: "ناصر الشمري", phone: "+96555050607" },
  { u: "hamad", name: "حمد الصباح", phone: "+96555060708" },
  { u: "salem", name: "سالم الفضلي", phone: "+96555070809" },
  { u: "mishari", name: "مشاري الدوسري", phone: "+96555080910" },
  { u: "noura", name: "نورة العلي", phone: "+96555091011", locale: "ar" },
  { u: "dana", name: "دانة الخالد", phone: "+96555101112", locale: "ar" },
];

const users = JSON.parse(readFileSync("db/users.json", "utf8"));
const memberships = JSON.parse(readFileSync("db/memberships.json", "utf8"));

// Every demo account uses "123". Deterministic salt so the hash is stable
// across runs — real accounts get a random salt from hashPassword().
for (const [i, m] of NEW_MEMBERS.entries()) {
  if (users.some((u) => u.username === m.u)) continue;
  const salt = `demo${String(i).padStart(2, "0")}`.padEnd(32, "0");
  const { hash } = hashPassword("123", salt);
  users.push({
    id: `usr-${m.u}`,
    username: m.u,
    phone: m.phone,
    name: m.name,
    role: "member",
    locale: m.locale ?? "ar",
    passwordSalt: salt,
    passwordHash: hash,
  });
}

const token = (u, n) =>
  `FG-${u.toUpperCase().slice(0, 4)}-${String(n).padStart(4, "0")}${["QX", "PL", "WT", "K7", "B3", "9M"][n % 6]}`;

// A believable spread of states. A members list that is all "active" proves
// nothing about how the screen handles the rest.
const NEW_MEMBERSHIPS = [
  ["yousef", IRON, PLAN.ironMonthly, "active", { start: -12, end: 18 }, 19900],
  ["bader", IRON, PLAN.ironYearly, "active", { start: -140, end: 225 }, 199999],
  ["khaled", IRON, PLAN.ironQuarterly, "active", { start: -40, end: 50 }, 67500],
  ["faisal", IRON, PLAN.ironMonthly, "active", { start: -3, end: 27 }, 19900],
  ["nasser", IRON, PLAN.ironMonthly, "frozen", { frozen: -9, resumes: 6 }, 19900],
  ["hamad", IRON, PLAN.ironQuarterly, "expired", { ended: -21 }, 67500],
  ["salem", IRON, PLAN.ironDay, "expired", { ended: -5 }, 3000],
  ["mishari", IRON, PLAN.ironMonthly, "cancelled", { cancelled: -16 }, 19900, 12400],
  ["noura", NAWA, PLAN.nawaMonthly, "active", { start: -22, end: 8 }, 38000],
  ["dana", NAWA, PLAN.nawaMonthly, "pending_payment", {}, 38000],
  ["yousef", GULF, PLAN.gulfMonthly, "active", { start: -6, end: 24 }, 18750],
];

for (const [
  i,
  [u, gymId, planId, state, dates, price, refund],
] of NEW_MEMBERSHIPS.entries()) {
  const id = `mem-${u}-${gymId.slice(-4)}`;
  if (memberships.some((m) => m.id === id)) continue;
  memberships.push({
    id,
    userId: `usr-${u}`,
    gymId,
    planId,
    state,
    startsOn: dates.start === undefined ? null : iso(daysAgo(-dates.start)),
    endsOn: dates.end === undefined ? null : iso(daysAhead(dates.end)),
    frozenAt: dates.frozen === undefined ? null : iso(daysAgo(-dates.frozen)),
    resumesOn: dates.resumes === undefined ? null : iso(daysAhead(dates.resumes)),
    cancelledAt: dates.cancelled === undefined ? null : iso(daysAgo(-dates.cancelled)),
    endedOn: dates.ended === undefined ? null : iso(daysAgo(-dates.ended)),
    pricePaid: price,
    refundAmount: refund ?? null,
    checkInToken: token(u, i + 1),
  });
}

// ── check-ins ───────────────────────────────────────────────────────────────
// Only a membership that was valid on the day can produce a check-in, so the
// log never contradicts the roster.

const rand = rng(20260823);
const checkIns = [];

/**
 * Kuwaiti gym traffic is bimodal: before work (6-9am) and after Isha (5-9pm),
 * in LOCAL time. Timestamps are stored UTC and rendered in Asia/Kuwait, so
 * subtract the +3 offset here or every morning scan displays as mid-morning
 * and the evening peak spills past the gym's midnight closing time.
 */
const KUWAIT_OFFSET_HOURS = 3;

function localHourFor(r) {
  return r < 0.4 ? 6 + Math.floor(r * 7.5) : 17 + Math.floor((r - 0.4) * 6.7);
}

const WINDOW_DAYS = 45;

const DAY_PASS_PLANS = new Set([PLAN.ironDay]);

for (const m of memberships) {
  // A day pass buys exactly one day. Letting the generic window run would
  // hand it a month of visits — the kind of nonsense a gym owner spots in
  // the roster immediately.
  if (DAY_PASS_PLANS.has(m.planId)) {
    const on = new Date(m.endedOn ?? m.startsOn ?? daysAgo(1));
    const scanned = new Date(
      Date.UTC(
        on.getUTCFullYear(),
        on.getUTCMonth(),
        on.getUTCDate(),
        18 - KUWAIT_OFFSET_HOURS,
        22,
      ),
    );
    checkIns.push({
      id: `chk-${m.id}-${scanned.getTime()}`,
      membershipId: m.id,
      userId: m.userId,
      gymId: m.gymId,
      scannedAt: scanned.toISOString(),
    });
    continue;
  }

  // How often this member actually turns up, and over which days.
  let from, to, perWeek;
  if (m.state === "active") {
    from = m.startsOn ? new Date(m.startsOn) : daysAgo(WINDOW_DAYS);
    to = NOW;
    perWeek = 2 + Math.floor(rand() * 4);
  } else if (m.state === "frozen") {
    from = daysAgo(WINDOW_DAYS);
    to = new Date(m.frozenAt);
    perWeek = 2 + Math.floor(rand() * 3);
  } else if (m.state === "expired") {
    from = daysAgo(WINDOW_DAYS);
    to = new Date(m.endedOn);
    perWeek = 1 + Math.floor(rand() * 3);
  } else {
    continue; // cancelled and pending_payment never got through the door
  }

  const start = Math.max(from.getTime(), daysAgo(WINDOW_DAYS).getTime());
  const end = Math.min(to.getTime(), TODAY.getTime());
  if (end <= start) continue;

  for (let t = start; t <= end; t += 86400000) {
    const day = new Date(t);
    // Friday is the quiet day in Kuwait.
    const odds = (day.getUTCDay() === 5 ? perWeek * 0.4 : perWeek) / 7;
    if (rand() > odds) continue;
    const h = localHourFor(rand()) - KUWAIT_OFFSET_HOURS;
    const scanned = new Date(
      Date.UTC(
        day.getUTCFullYear(),
        day.getUTCMonth(),
        day.getUTCDate(),
        h,
        Math.floor(rand() * 60),
      ),
    );
    if (scanned > NOW) continue;
    checkIns.push({
      id: `chk-${m.id}-${scanned.getTime()}`,
      membershipId: m.id,
      userId: m.userId,
      gymId: m.gymId,
      scannedAt: scanned.toISOString(),
    });
  }
}

checkIns.sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));

// ── payments ────────────────────────────────────────────────────────────────
// Every membership that was actually paid for gets a payment row, so the
// admin's revenue and commission figures reconcile against the roster rather
// than reporting on the two hand-written rows that used to be here.

/** Platform default where a gym has no negotiated rate. 15%, in basis points. */
const DEFAULT_COMMISSION_BPS = 1500;

const gyms = JSON.parse(readFileSync("db/gyms.json", "utf8"));
const payments = [];

for (const m of memberships) {
  // Nothing has been taken for a membership still awaiting payment.
  if (m.state === "pending_payment") continue;

  const gym = gyms.find((g) => g.id === m.gymId);
  const bps = gym?.commissionBps ?? DEFAULT_COMMISSION_BPS;
  const { platform, gym: gymAmount } = splitCommission(fils(m.pricePaid), bps);

  // Paid when the membership began; a cancelled one was still paid for first.
  const paidAt = m.startsOn ?? m.cancelledAt ?? m.endedOn ?? iso(daysAgo(30));

  payments.push({
    id: `pay-${m.id}`,
    membershipId: m.id,
    amount: m.pricePaid,
    platformFee: platform,
    gymAmount,
    commissionBps: bps,
    provider: "myfatoorah",
    method: m.pricePaid > 100000 ? "card" : "knet",
    status: m.state === "cancelled" ? "refunded" : "paid",
    paidAt,
  });
}

payments.sort((a, b) => a.paidAt.localeCompare(b.paidAt));

const w = (f, d) =>
  writeFileSync(`db/${f}.json`, JSON.stringify(d, null, 2) + "\n", "utf8");
w("users", users);
w("memberships", memberships);
w("checkins", checkIns);
w("payments", payments);

console.log(`users:       ${users.length}`);
console.log(`memberships: ${memberships.length}`);
console.log(`check-ins:   ${checkIns.length}`);
console.log(`  iron-club: ${checkIns.filter((c) => c.gymId === IRON).length}`);
console.log(`payments:    ${payments.length}`);
