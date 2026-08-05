/**
 * Money.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RULE: money is always an integer count of fils. Never a decimal, never a
 * float, never a `number` that came from parsing user input directly.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Why this file exists at all:
 *
 * In C# you would reach for `decimal`, which stores base-10 fractions exactly.
 * JavaScript has no decimal type — every number is an IEEE-754 double. So
 * `0.1 + 0.2 === 0.30000000000000004`, and money arithmetic accumulates error.
 *
 * Kuwait makes this sharper than most markets: KWD has **three** decimal
 * places, not two. 1 dinar = 1000 fils. A price of "12.500 KWD" is 12500 fils.
 *
 * Get this wrong and nothing breaks loudly. It surfaces months later as gym
 * payouts that are off by a few fils and will not reconcile — the worst
 * possible place to discover a rounding bug.
 */

declare const filsBrand: unique symbol;

/**
 * A "branded" type. At runtime this is just a number; at compile time it is a
 * distinct type, so a raw `number` cannot be passed where `Fils` is expected.
 *
 * C# would do this with a readonly struct. TypeScript has no runtime wrapper —
 * this is a pure compile-time trick with zero cost — but it gives you the same
 * protection: you cannot accidentally add a price to a rating.
 */
export type Fils = number & { readonly [filsBrand]: "Fils" };

/** 1 KWD = 1000 fils. Unusual — most currencies use 100 minor units. */
export const FILS_PER_DINAR = 1000;

export const ZERO = 0 as Fils;

// ─────────────────────────────────────────────────────────────── construction

/**
 * The only sanctioned way to create Fils from a raw number.
 * Throws on anything that is not a safe, non-negative integer.
 */
export function fils(value: number): Fils {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`Fils must be a whole number, received: ${value}`);
  }
  if (value < 0) {
    throw new RangeError(`Fils cannot be negative, received: ${value}`);
  }
  return value as Fils;
}

/**
 * Parses a human-written amount such as "12.500", "12.5" or "12".
 *
 * Deliberately string-based: it never routes the value through a float, so
 * there is no rounding to get wrong. This is the correct way to read a price
 * from a form, an API payload, or a CSV import from a gym.
 */
export function parseKwd(input: string): Fils {
  const trimmed = input.trim().replace(/,/g, "");
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(trimmed);
  if (!match) {
    throw new TypeError(`Not a valid KWD amount: "${input}"`);
  }

  const dinars = Number(match[1]);
  // "12.5" means 500 fils, not 5 — pad the fractional part to three digits.
  const fraction = (match[2] ?? "").padEnd(3, "0");

  return fils(dinars * FILS_PER_DINAR + Number(fraction));
}

/**
 * Converts from a decimal number of dinars.
 *
 * Prefer `parseKwd` wherever the value started life as text. This exists for
 * the cases where you genuinely have a number already, and it rounds rather
 * than truncating so that 12.4999999 becomes 12500 rather than 12499.
 */
export function fromDinars(dinars: number): Fils {
  if (!Number.isFinite(dinars)) {
    throw new TypeError(`Not a finite amount: ${dinars}`);
  }
  return fils(Math.round(dinars * FILS_PER_DINAR));
}

// ───────────────────────────────────────────────────────────────── arithmetic

export function add(a: Fils, b: Fils): Fils {
  return fils(a + b);
}

/** Throws rather than returning a negative amount — that is always a bug here. */
export function subtract(a: Fils, b: Fils): Fils {
  return fils(a - b);
}

/** Multiplies by a whole quantity, e.g. three months of the same plan. */
export function multiply(amount: Fils, quantity: number): Fils {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new RangeError(`Quantity must be a non-negative whole number: ${quantity}`);
  }
  return fils(amount * quantity);
}

export const isZero = (a: Fils): boolean => a === 0;
export const compare = (a: Fils, b: Fils): number => a - b;
export const max = (a: Fils, b: Fils): Fils => (a >= b ? a : b);
export const min = (a: Fils, b: Fils): Fils => (a <= b ? a : b);

// ──────────────────────────────────────────────────────────── rates and splits

/**
 * Percentages are expressed in **basis points**: whole numbers where
 * 10000 bp = 100%. So a 15% commission is 1500, and 2.5% is 250.
 *
 * Using integers rather than 0.15 keeps rates out of floating-point entirely.
 */
export type BasisPoints = number;

export const percentToBasisPoints = (percent: number): BasisPoints =>
  Math.round(percent * 100);

/**
 * Splits a payment between the platform and the gym.
 *
 * The platform's cut is rounded DOWN, and the gym receives the remainder. That
 * means the two parts always sum to exactly the amount the customer paid — no
 * stray fils appears or vanishes — and any rounding difference favours the gym,
 * which is the side you want to err on in a marketplace.
 */
export function splitCommission(
  total: Fils,
  rate: BasisPoints,
): { readonly platform: Fils; readonly gym: Fils } {
  if (!Number.isSafeInteger(rate) || rate < 0 || rate > 10_000) {
    throw new RangeError(`Commission must be 0–10000 basis points, received: ${rate}`);
  }
  const platform = fils(Math.floor((total * rate) / 10_000));
  return { platform, gym: subtract(total, platform) };
}

/**
 * Divides an amount into parts by weight, losing nothing.
 *
 * The naive approach — dividing and rounding each part — silently loses or
 * invents fils. This distributes the remainder one fil at a time, so the parts
 * always sum back to the original. Needed for split payouts and for prorating
 * a refund across a partly-used membership.
 *
 *   allocate(fils(1000), [1, 1, 1])  →  [334, 333, 333]
 */
export function allocate(total: Fils, weights: readonly number[]): readonly Fils[] {
  if (weights.length === 0) {
    throw new RangeError("Cannot allocate across zero parts");
  }
  if (weights.some((w) => w < 0)) {
    throw new RangeError("Allocation weights cannot be negative");
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) {
    throw new RangeError("Allocation weights must sum to more than zero");
  }

  const shares = weights.map((w) => Math.floor((total * w) / totalWeight));
  let remainder = total - shares.reduce((sum, s) => sum + s, 0);

  // Hand the leftover fils out one at a time, largest weight first.
  const order = weights.map((w, i) => ({ w, i })).sort((a, b) => b.w - a.w);

  for (const { i } of order) {
    if (remainder <= 0) break;
    shares[i] = (shares[i] ?? 0) + 1;
    remainder -= 1;
  }

  return shares.map((s) => fils(s));
}

// ───────────────────────────────────────────────────────────────── formatting

/**
 * Formats for display. This is the ONLY place fils become a decimal string,
 * and it happens at the very edge of the app — never in storage, never in an
 * API payload, never in a calculation.
 *
 *   formatKwd(fils(12500), "en")  →  "KWD 12.500"
 *   formatKwd(fils(12500), "ar")  →  "‏12.500 د.ك."
 */
export function formatKwd(amount: Fils, locale: "ar" | "en" = "ar"): string {
  // Western digits even in Arabic — the norm for Kuwaiti apps.
  const tag = locale === "ar" ? "ar-KW-u-nu-latn" : "en-KW";

  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: "KWD", // Intl already knows KWD has three decimal places.
  }).format(amount / FILS_PER_DINAR);
}

/** Bare number, no currency symbol — for input fields and CSV export. */
export function toDecimalString(amount: Fils): string {
  const dinars = Math.floor(amount / FILS_PER_DINAR);
  const remainder = amount % FILS_PER_DINAR;
  return `${dinars}.${String(remainder).padStart(3, "0")}`;
}
