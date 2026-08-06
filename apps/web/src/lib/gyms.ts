import { parseKwd } from "@fg/core";
import type { Gym, MembershipPlan } from "@fg/core";

/**
 * Sample data standing in for the API.
 *
 * It is typed against the real domain types from `@fg/core`, so when the
 * backend arrives only this file is deleted — every screen already handles the
 * correct shapes, including the awkward cases (an unrated gym, a pending
 * verification, a plan with no offer).
 */

export interface GymDetail extends Gym {
  readonly hours: { readonly ar: string; readonly en: string };
  readonly address: { readonly ar: string; readonly en: string };
  readonly openNow: boolean;
}

export const GYMS: readonly GymDetail[] = [
  {
    id: "iron-club",
    name: { ar: "نادي الحديد", en: "Iron Club" },
    description: {
      ar: "نادٍ متكامل للرجال في قلب السالمية، مجهّز بأحدث الأجهزة ومساحة أوزان حرة واسعة، مع مدربين معتمدين طوال اليوم.",
      en: "A full-service men's gym in the heart of Salmiya, with a large free-weights floor, modern cardio equipment and certified trainers on the floor all day.",
    },
    governorate: "hawalli",
    area: { ar: "السالمية", en: "Salmiya" },
    address: { ar: "شارع سالم المبارك، السالمية", en: "Salem Al Mubarak St, Salmiya" },
    hours: { ar: "٦:٠٠ ص – ١٢:٠٠ م", en: "6:00 AM – 12:00 AM" },
    openNow: true,
    access: "men",
    verification: { state: "verified", verifiedAt: "2026-05-02T09:00:00Z" },
    rating: 4.7,
    reviewCount: 213,
    startingPrice: parseKwd("19.900"),
    photos: ["/gyms/iron-club-1.jpg", "/gyms/iron-club-2.jpg", "/gyms/iron-club-3.jpg"],
    amenities: [
      "freeWeights",
      "cardio",
      "sauna",
      "parking",
      "lockers",
      "personalTraining",
    ],
    location: { lat: 29.33, lng: 48.07 },
  },
  {
    id: "nawa-studio",
    name: { ar: "ستوديو نُوَى", en: "Nawa Studio" },
    description: {
      ar: "ستوديو نسائي بالكامل في الشويخ، يركّز على الحصص الجماعية والتدريب الوظيفي، مع خصوصية تامة وحضانة أطفال.",
      en: "A women-only studio in Shuwaikh focused on group classes and functional training, with full privacy and on-site childcare.",
    },
    governorate: "capital",
    area: { ar: "الشويخ", en: "Shuwaikh" },
    address: { ar: "شارع الاستقلال، الشويخ", en: "Istiqlal St, Shuwaikh" },
    hours: { ar: "٧:٠٠ ص – ١٠:٠٠ م", en: "7:00 AM – 10:00 PM" },
    openNow: true,
    access: "women",
    verification: { state: "verified", verifiedAt: "2026-06-11T09:00:00Z" },
    rating: 4.9,
    reviewCount: 88,
    startingPrice: parseKwd("32.500"),
    photos: [
      "/gyms/nawa-studio-1.jpg",
      "/gyms/nawa-studio-2.jpg",
      "/gyms/nawa-studio-3.jpg",
    ],
    amenities: ["classes", "childcare", "lockers", "personalTraining"],
    location: { lat: 29.35, lng: 47.93 },
  },
  {
    id: "gulf-fitness",
    name: { ar: "مركز الخليج للياقة", en: "Gulf Fitness Centre" },
    description: {
      ar: "مركز بأقسام منفصلة للرجال والنساء في الفروانية، بأسعار في متناول الجميع ومسبح داخلي.",
      en: "Separate men's and women's sections in Farwaniya, at accessible prices, with an indoor pool.",
    },
    governorate: "farwaniya",
    area: { ar: "الفروانية", en: "Farwaniya" },
    address: { ar: "شارع حبيب مناور، الفروانية", en: "Habib Munawer St, Farwaniya" },
    hours: { ar: "٥:٠٠ ص – ١١:٠٠ م", en: "5:00 AM – 11:00 PM" },
    openNow: false,
    access: "separate_sections",
    // Not yet approved — the profile must still render, without a verified badge.
    verification: { state: "pending", submittedAt: "2026-07-20T09:00:00Z" },
    rating: null,
    reviewCount: 0,
    startingPrice: parseKwd("18.750"),
    photos: [
      "/gyms/gulf-fitness-1.jpg",
      "/gyms/gulf-fitness-2.jpg",
      "/gyms/gulf-fitness-3.jpg",
    ],
    amenities: ["pool", "parking", "cardio", "lockers"],
    location: { lat: 29.27, lng: 47.95 },
  },
];

export const PLANS: readonly MembershipPlan[] = [
  {
    id: "iron-day",
    gymId: "iron-club",
    name: { ar: "دخول يومي", en: "Day pass" },
    duration: "day_pass",
    listPrice: parseKwd("3.000"),
    offerPrice: null,
  },
  {
    id: "iron-monthly",
    gymId: "iron-club",
    name: { ar: "شهري", en: "Monthly" },
    duration: "monthly",
    listPrice: parseKwd("25.000"),
    offerPrice: parseKwd("19.900"),
  },
  {
    id: "iron-quarterly",
    gymId: "iron-club",
    name: { ar: "ربع سنوي", en: "Quarterly" },
    duration: "quarterly",
    listPrice: parseKwd("67.500"),
    offerPrice: null,
  },
  {
    id: "iron-yearly",
    gymId: "iron-club",
    name: { ar: "سنوي", en: "Yearly" },
    duration: "yearly",
    listPrice: parseKwd("240.000"),
    offerPrice: parseKwd("199.999"),
  },
  {
    id: "nawa-monthly",
    gymId: "nawa-studio",
    name: { ar: "شهري", en: "Monthly" },
    duration: "monthly",
    listPrice: parseKwd("38.000"),
    offerPrice: parseKwd("32.500"),
  },
  {
    id: "nawa-yearly",
    gymId: "nawa-studio",
    name: { ar: "سنوي", en: "Yearly" },
    duration: "yearly",
    listPrice: parseKwd("360.000"),
    offerPrice: null,
  },
  {
    id: "gulf-monthly",
    gymId: "gulf-fitness",
    name: { ar: "شهري", en: "Monthly" },
    duration: "monthly",
    listPrice: parseKwd("18.750"),
    offerPrice: null,
  },
];

export const findGym = (id: string): GymDetail | undefined =>
  GYMS.find((g) => g.id === id);

export const plansForGym = (gymId: string): readonly MembershipPlan[] =>
  PLANS.filter((p) => p.gymId === gymId);
