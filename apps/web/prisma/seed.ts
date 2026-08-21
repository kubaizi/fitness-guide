/**
 * Seeds the local database with development data.
 *
 *   npm run db:seed --workspace=@fg/web
 *
 * Safe to run repeatedly — it clears the tables first, so it always produces
 * the same known state. Never point this at production.
 *
 * Prices go through parseKwd, so the values here read as human amounts
 * ("19.900") while what lands in the database is an integer count of fils.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fils, parseKwd, splitCommission } from "@fg/core";

// Prisma 7 needs an explicit driver adapter. This script runs outside Next.js,
// so it loads .env itself and builds its own client rather than importing the
// app's singleton.
const connectionString = process.env["DATABASE_URL"];
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Platform default commission, in basis points. 1500 = 15%. */
const DEFAULT_COMMISSION_BPS = 1500;

async function main() {
  // Order matters: children before parents, or the foreign keys block it.
  await prisma.checkIn.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.gymPhoto.deleteMany();
  await prisma.user.updateMany({ data: { staffAtGymId: null } });
  await prisma.gym.deleteMany();
  await prisma.user.deleteMany();

  const member = await prisma.user.create({
    data: {
      phone: "+96590000001",
      name: "عبدالله",
      gender: "male",
      locale: "ar",
      role: "member",
    },
  });

  const ironClub = await prisma.gym.create({
    data: {
      slug: "iron-club",
      nameAr: "نادي الحديد",
      nameEn: "Iron Club",
      descriptionAr:
        "نادٍ متكامل للرجال في قلب السالمية، مجهّز بأحدث الأجهزة ومساحة أوزان حرة واسعة، مع مدربين معتمدين طوال اليوم.",
      descriptionEn:
        "A full-service men's gym in the heart of Salmiya, with a large free-weights floor, modern cardio equipment and certified trainers on the floor all day.",
      areaAr: "السالمية",
      areaEn: "Salmiya",
      addressAr: "شارع سالم المبارك، السالمية",
      addressEn: "Salem Al Mubarak St, Salmiya",
      hoursAr: "٦:٠٠ ص – ١٢:٠٠ م",
      hoursEn: "6:00 AM – 12:00 AM",
      governorate: "hawalli",
      access: "men",
      verification: "verified",
      verifiedAt: new Date("2026-05-02T09:00:00Z"),
      rating: 4.7,
      reviewCount: 213,
      latitude: 29.33,
      longitude: 48.07,
      amenities: [
        "freeWeights",
        "cardio",
        "sauna",
        "parking",
        "lockers",
        "personalTraining",
      ],
      photos: {
        create: [
          { url: "/gyms/iron-club-1.jpg", position: 0 },
          { url: "/gyms/iron-club-2.jpg", position: 1 },
          { url: "/gyms/iron-club-3.jpg", position: 2 },
        ],
      },
      plans: {
        create: [
          {
            nameAr: "دخول يومي",
            nameEn: "Day pass",
            duration: "day_pass",
            listPrice: parseKwd("3.000"),
          },
          {
            nameAr: "شهري",
            nameEn: "Monthly",
            duration: "monthly",
            listPrice: parseKwd("25.000"),
            offerPrice: parseKwd("19.900"),
          },
          {
            nameAr: "ربع سنوي",
            nameEn: "Quarterly",
            duration: "quarterly",
            listPrice: parseKwd("67.500"),
          },
          {
            nameAr: "سنوي",
            nameEn: "Yearly",
            duration: "yearly",
            listPrice: parseKwd("240.000"),
            offerPrice: parseKwd("199.999"),
          },
        ],
      },
    },
    include: { plans: true },
  });

  const nawaStudio = await prisma.gym.create({
    data: {
      slug: "nawa-studio",
      nameAr: "ستوديو نُوَى",
      nameEn: "Nawa Studio",
      descriptionAr:
        "ستوديو نسائي بالكامل في الشويخ، يركّز على الحصص الجماعية والتدريب الوظيفي، مع خصوصية تامة وحضانة أطفال.",
      descriptionEn:
        "A women-only studio in Shuwaikh focused on group classes and functional training, with full privacy and on-site childcare.",
      areaAr: "الشويخ",
      areaEn: "Shuwaikh",
      addressAr: "شارع الاستقلال، الشويخ",
      addressEn: "Istiqlal St, Shuwaikh",
      hoursAr: "٧:٠٠ ص – ١٠:٠٠ م",
      hoursEn: "7:00 AM – 10:00 PM",
      governorate: "capital",
      access: "women",
      verification: "verified",
      verifiedAt: new Date("2026-06-11T09:00:00Z"),
      rating: 4.9,
      reviewCount: 88,
      latitude: 29.35,
      longitude: 47.93,
      amenities: ["classes", "childcare", "lockers", "personalTraining"],
      photos: {
        create: [
          { url: "/gyms/nawa-studio-1.jpg", position: 0 },
          { url: "/gyms/nawa-studio-2.jpg", position: 1 },
          { url: "/gyms/nawa-studio-3.jpg", position: 2 },
        ],
      },
      plans: {
        create: [
          {
            nameAr: "شهري",
            nameEn: "Monthly",
            duration: "monthly",
            listPrice: parseKwd("38.000"),
            offerPrice: parseKwd("32.500"),
          },
          {
            nameAr: "سنوي",
            nameEn: "Yearly",
            duration: "yearly",
            listPrice: parseKwd("360.000"),
          },
        ],
      },
    },
    include: { plans: true },
  });

  // Deliberately still pending: the app must render an unverified gym with no
  // rating, and this is the row that proves it does.
  await prisma.gym.create({
    data: {
      slug: "gulf-fitness",
      nameAr: "مركز الخليج للياقة",
      nameEn: "Gulf Fitness Centre",
      descriptionAr:
        "مركز بأقسام منفصلة للرجال والنساء في الفروانية، بأسعار في متناول الجميع ومسبح داخلي.",
      descriptionEn:
        "Separate men's and women's sections in Farwaniya, at accessible prices, with an indoor pool.",
      areaAr: "الفروانية",
      areaEn: "Farwaniya",
      addressAr: "شارع حبيب مناور، الفروانية",
      addressEn: "Habib Munawer St, Farwaniya",
      hoursAr: "٥:٠٠ ص – ١١:٠٠ م",
      hoursEn: "5:00 AM – 11:00 PM",
      governorate: "farwaniya",
      access: "separate_sections",
      verification: "pending",
      submittedAt: new Date("2026-07-20T09:00:00Z"),
      rating: null,
      reviewCount: 0,
      latitude: 29.27,
      longitude: 47.95,
      amenities: ["pool", "parking", "cardio", "lockers"],
      photos: {
        create: [
          { url: "/gyms/gulf-fitness-1.jpg", position: 0 },
          { url: "/gyms/gulf-fitness-2.jpg", position: 1 },
          { url: "/gyms/gulf-fitness-3.jpg", position: 2 },
        ],
      },
      plans: {
        create: [
          {
            nameAr: "شهري",
            nameEn: "Monthly",
            duration: "monthly",
            listPrice: parseKwd("18.750"),
          },
        ],
      },
    },
  });

  // ── memberships ──────────────────────────────────────────────────────────
  const monthly = ironClub.plans.find((p) => p.duration === "monthly");
  const nawaMonthly = nawaStudio.plans.find((p) => p.duration === "monthly");
  if (!monthly || !nawaMonthly) throw new Error("Seed plans missing");

  // Prisma types an Int column as a plain `number`. `fils()` converts it to the
  // branded Fils type — and TypeScript refuses splitCommission() without it,
  // which is precisely the guardrail the brand exists to provide.
  const paid = fils(monthly.offerPrice ?? monthly.listPrice);
  const split = splitCommission(paid, DEFAULT_COMMISSION_BPS);

  await prisma.membership.create({
    data: {
      userId: member.id,
      gymId: ironClub.id,
      planId: monthly.id,
      state: "active",
      startsOn: new Date("2026-07-12T00:00:00Z"),
      endsOn: new Date("2026-08-12T00:00:00Z"),
      pricePaid: paid,
      checkInToken: "FG-8241-K7QX2M",
      payment: {
        create: {
          amount: paid,
          platformFee: split.platform,
          gymAmount: split.gym,
          commissionBps: DEFAULT_COMMISSION_BPS,
          provider: "myfatoorah",
          method: "knet",
          status: "paid",
          paidAt: new Date("2026-07-12T00:00:00Z"),
        },
      },
    },
  });

  const expiredPaid = nawaMonthly.offerPrice ?? nawaMonthly.listPrice;
  await prisma.membership.create({
    data: {
      userId: member.id,
      gymId: nawaStudio.id,
      planId: nawaMonthly.id,
      state: "expired",
      endedOn: new Date("2026-06-30T00:00:00Z"),
      pricePaid: expiredPaid,
      checkInToken: "FG-7730-B3PL9D",
    },
  });

  const counts = {
    users: await prisma.user.count(),
    gyms: await prisma.gym.count(),
    plans: await prisma.membershipPlan.count(),
    photos: await prisma.gymPhoto.count(),
    memberships: await prisma.membership.count(),
    payments: await prisma.payment.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
