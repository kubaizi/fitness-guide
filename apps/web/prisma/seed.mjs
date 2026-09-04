// Load the demo data from db/*.json into Postgres.
//
// Run it with:  npm run db:seed  (from apps/web)
//
// This is safe to run again and again. It clears the tables first, so the
// database always ends up matching the JSON files exactly rather than growing
// a second copy of everything.
//
// The JSON files stay in the repo on purpose. They are the readable source of
// the demo data — you can open db/gyms.json and see the four gyms — and this
// script is the one place that turns them into rows.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Read one of the JSON files in db/. */
function load(name) {
  const path = fileURLToPath(new URL(`../db/${name}.json`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * The JSON keeps a date as a string; Postgres wants a real Date. Nulls stay
 * null, because "no end date" is a real answer, not a missing one.
 */
function date(value) {
  return value == null ? null : new Date(value);
}

async function main() {
  const users = load("users");
  const gyms = load("gyms");
  const plans = load("plans");
  const memberships = load("memberships");
  const payments = load("payments");
  const checkIns = load("checkins");

  // Delete children before parents. A row cannot go while another row still
  // points at it — that is the whole point of a foreign key.
  await prisma.checkIn.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.gym.deleteMany();

  // Insert parents before children, for the same reason in reverse. Gyms come
  // before users because a gym owner points at the gym they run.
  await prisma.gym.createMany({
    data: gyms.map((g) => ({
      id: g.id,
      slug: g.slug,
      // The JSON holds `{ ar, en }` objects; the table holds two columns. One
      // column per language is what lets Postgres index and search each one.
      nameAr: g.name.ar,
      nameEn: g.name.en,
      descriptionAr: g.description.ar,
      descriptionEn: g.description.en,
      areaAr: g.area.ar,
      areaEn: g.area.en,
      addressAr: g.address.ar,
      addressEn: g.address.en,
      hoursAr: g.hours.ar,
      hoursEn: g.hours.en,
      governorate: g.governorate,
      access: g.access,
      verification: g.verification,
      verifiedAt: date(g.verifiedAt),
      submittedAt: date(g.submittedAt),
      rejectionReason: g.rejectionReason,
      rating: g.rating,
      reviewCount: g.reviewCount,
      latitude: g.latitude,
      longitude: g.longitude,
      amenities: g.amenities,
      photos: g.photos,
      openNow: g.openNow,
      commissionBps: g.commissionBps,
    })),
  });

  await prisma.user.createMany({
    data: users.map((u) => ({
      id: u.id,
      username: u.username,
      passwordHash: u.passwordHash,
      passwordSalt: u.passwordSalt,
      phone: u.phone,
      name: u.name,
      role: u.role,
      locale: u.locale,
      staffAtGymId: u.staffAtGymId ?? null,
    })),
  });

  await prisma.membershipPlan.createMany({
    data: plans.map((p) => ({
      id: p.id,
      gymId: p.gymId,
      nameAr: p.name.ar,
      nameEn: p.name.en,
      duration: p.duration,
      listPrice: p.listPrice,
      offerPrice: p.offerPrice,
      active: p.active,
    })),
  });

  await prisma.membership.createMany({
    data: memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      gymId: m.gymId,
      planId: m.planId,
      state: m.state,
      startsOn: date(m.startsOn),
      endsOn: date(m.endsOn),
      frozenAt: date(m.frozenAt),
      resumesOn: date(m.resumesOn),
      cancelledAt: date(m.cancelledAt),
      endedOn: date(m.endedOn),
      pricePaid: m.pricePaid,
      refundAmount: m.refundAmount,
      checkInToken: m.checkInToken,
    })),
  });

  await prisma.payment.createMany({
    data: payments.map((p) => ({
      id: p.id,
      membershipId: p.membershipId,
      amount: p.amount,
      platformFee: p.platformFee,
      gymAmount: p.gymAmount,
      commissionBps: p.commissionBps,
      provider: p.provider,
      method: p.method,
      status: p.status,
      paidAt: date(p.paidAt),
    })),
  });

  await prisma.checkIn.createMany({
    data: checkIns.map((c) => ({
      id: c.id,
      membershipId: c.membershipId,
      userId: c.userId,
      gymId: c.gymId,
      scannedAt: date(c.scannedAt),
    })),
  });

  console.log(
    `Seeded: ${gyms.length} gyms, ${users.length} users, ${plans.length} plans, ` +
      `${memberships.length} memberships, ${payments.length} payments, ` +
      `${checkIns.length} check-ins.`,
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
