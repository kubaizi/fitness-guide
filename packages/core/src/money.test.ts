/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Tests for money.ts — and an introduction to how testing works here.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The runner is VITEST. It finds every file ending in `.test.ts`, runs it, and
 * reports which assertions failed. Run them all with `npm test` from the repo
 * root. Coming from .NET, it plays the role of xUnit or NUnit.
 *
 * Three functions do almost everything:
 *
 *   describe("name", () => { ... })  groups related tests. Purely for
 *                                    readable output; groups may nest.
 *   it("does something", () => { }) one test case. Read the string as the
 *                                    sentence "it <does something>" — that is
 *                                    why the descriptions start with a verb.
 *   expect(actual).toBe(expected)   one assertion.
 *
 * The `() => { ... }` passed to each is a CALLBACK: a function handed to
 * another function to be run later. `describe` runs its callback immediately
 * to discover the tests inside; `it` stores its callback and runs it when the
 * suite executes.
 *
 * ── The matchers used below ──
 *   .toBe(x)         strict equality (===). Correct for numbers and strings.
 *   .toEqual(x)      deep structural equality. Needed for arrays and objects,
 *                    because [1,2] === [1,2] is FALSE in JavaScript — two
 *                    separate arrays are never the same reference.
 *   .toContain(x)    substring, or array membership.
 *   .toThrow()       asserts the code threw. Note it takes a FUNCTION, not a
 *                    value — see the note at the first use below.
 *   .not.<matcher>   inverts any matcher.
 */

// Vitest's functions must be imported explicitly. (Jest injected them as
// globals; Vitest can too, but explicit imports are clearer and let the
// editor jump to the definitions.)
import { describe, expect, it } from "vitest";
// Importing from "./money" — the real module, not a copy. These tests
// exercise the actual shipping code.
import {
  add,
  allocate,
  fils,
  formatKwd,
  fromDinars,
  multiply,
  parseKwd,
  percentToBasisPoints,
  splitCommission,
  subtract,
  toDecimalString,
} from "./money";

describe("parseKwd", () => {
  it("reads three decimal places", () => {
    // `12_500` is just 12500 — the underscore is a readability separator.
    expect(parseKwd("12.500")).toBe(12_500);
  });

  it("pads a short fraction — 12.5 KWD is 500 fils, not 5", () => {
    expect(parseKwd("12.5")).toBe(12_500);
    expect(parseKwd("12.05")).toBe(12_050);
    expect(parseKwd("12.005")).toBe(12_005);
  });

  it("handles whole dinars and thousands separators", () => {
    expect(parseKwd("12")).toBe(12_000);
    expect(parseKwd("1,250.750")).toBe(1_250_750);
  });

  it("rejects malformed input rather than guessing", () => {
    // ── Why `() => parseKwd(...)` and not `parseKwd(...)` ──
    // `expect(parseKwd("abc"))` would CALL the function immediately, it would
    // throw, and the test would error out before `expect` ever ran. Wrapping
    // it in an arrow function hands `expect` something it can call itself,
    // inside a try/catch, so it can check that throwing is what happened.
    //
    // Forgetting this wrapper is one of the most common testing mistakes.
    expect(() => parseKwd("12.5000")).toThrow(); // four decimals is not a KWD amount
    expect(() => parseKwd("abc")).toThrow();
    expect(() => parseKwd("-5.000")).toThrow();
    expect(() => parseKwd("")).toThrow();
  });
});

describe("floating point safety", () => {
  it("avoids the error that makes float money wrong", () => {
    // The bug this whole module exists to prevent:
    //
    // This assertion is unusual — it tests JavaScript itself rather than our
    // code. It is here as executable documentation: if you ever doubt why
    // money is stored as integers, run the suite and watch this pass.
    expect(0.1 + 0.2).not.toBe(0.3);

    // In fils it is exact.
    expect(add(parseKwd("0.100"), parseKwd("0.200"))).toBe(parseKwd("0.300"));
  });

  it("stays exact across many additions", () => {
    // A loop inside a test. One assertion after a thousand operations proves
    // something a single addition cannot: that error does not ACCUMULATE.
    // With floats, adding 0.001 a thousand times drifts off 1.0.
    let total = fils(0);
    // `i += 1` is preferred over `i++` in this codebase — same effect, but it
    // reads as a statement rather than an expression with a hidden result.
    for (let i = 0; i < 1000; i += 1) {
      total = add(total, parseKwd("0.001"));
    }
    expect(total).toBe(1000); // exactly 1.000 KWD
    expect(toDecimalString(total)).toBe("1.000");
  });
});

describe("arithmetic guards", () => {
  it("refuses fractional fils", () => {
    // `.toThrow(TypeError)` asserts not just that it threw, but WHICH class
    // of error. That pins down the distinction money.ts draws between
    // TypeError ("wrong kind of thing") and RangeError ("impossible value").
    expect(() => fils(12.5)).toThrow(TypeError);
  });

  it("refuses to produce a negative amount", () => {
    expect(() => subtract(parseKwd("5.000"), parseKwd("10.000"))).toThrow(RangeError);
  });

  it("multiplies by a whole quantity", () => {
    expect(multiply(parseKwd("25.000"), 3)).toBe(75_000);
    expect(() => multiply(parseKwd("25.000"), 2.5)).toThrow(RangeError);
  });

  it("rounds when converting from a decimal number", () => {
    // The two cases below sit either side of the rounding boundary — 0.0004
    // of a dinar rounds down to nothing, 0.0006 rounds up to one fil. Testing
    // just either side of a boundary is where bugs actually live.
    expect(fromDinars(12.5)).toBe(12_500);
    expect(fromDinars(0.0004)).toBe(0);
    expect(fromDinars(0.0006)).toBe(1);
  });
});

describe("splitCommission", () => {
  it("splits a clean amount", () => {
    // DESTRUCTURING a returned object: `const { platform, gym } = ...` pulls
    // both fields out into their own variables in one line, instead of
    // `const result = ...; const platform = result.platform;`
    const { platform, gym } = splitCommission(parseKwd("100.000"), 1500); // 15%
    expect(platform).toBe(15_000);
    expect(gym).toBe(85_000);
  });

  it("never loses or invents a fil, whatever the rate", () => {
    // A PROPERTY TEST: rather than checking specific known answers, it asserts
    // a rule that must hold for every input — the parts always sum to the
    // whole. The step of 137 is a prime-ish number chosen to land on awkward
    // rates rather than round ones.
    const total = parseKwd("33.333");
    for (let rate = 0; rate <= 10_000; rate += 137) {
      const { platform, gym } = splitCommission(total, rate);
      expect(platform + gym).toBe(total);
    }
  });

  it("rounds in the gym's favour", () => {
    // 1 fil at 15% is 0.15 of a fil; the platform gets nothing.
    const { platform, gym } = splitCommission(fils(1), 1500);
    expect(platform).toBe(0);
    expect(gym).toBe(1);
  });

  it("converts percentages to basis points", () => {
    expect(percentToBasisPoints(15)).toBe(1500);
    expect(percentToBasisPoints(2.5)).toBe(250);
  });

  it("rejects an impossible rate", () => {
    expect(() => splitCommission(parseKwd("10.000"), 12_000)).toThrow(RangeError);
  });
});

describe("allocate", () => {
  it("distributes the remainder instead of dropping it", () => {
    const parts = allocate(fils(1000), [1, 1, 1]);
    // `.toEqual` rather than `.toBe` — comparing arrays. `.toBe` would fail
    // even though the contents match, because the two arrays are different
    // objects in memory.
    expect(parts).toEqual([334, 333, 333]);
    // 1000 does not divide into three, so one part must get the extra fil.
    // A naive implementation returns [333, 333, 333] and quietly loses one.
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it("respects weights", () => {
    const parts = allocate(parseKwd("100.000"), [70, 30]);
    expect(parts).toEqual([70_000, 30_000]);
  });

  it("always sums back to the original", () => {
    const total = parseKwd("77.777");
    const parts = allocate(total, [3, 5, 7, 11]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
  });

  it("rejects a meaningless split", () => {
    expect(() => allocate(fils(100), [])).toThrow(RangeError);
    expect(() => allocate(fils(100), [0, 0])).toThrow(RangeError);
  });
});

describe("formatting", () => {
  it("renders three decimal places", () => {
    // Intl inserts its own spacing and marks, so assert on the digits.
    //
    // Worth understanding: `Intl` output includes non-breaking spaces and
    // right-to-left marks that are invisible in a diff but break `.toBe`.
    // Asserting `.toContain("12.500")` tests what actually matters and stays
    // stable when Node updates its locale data.
    expect(formatKwd(parseKwd("12.500"), "en")).toContain("12.500");
    expect(formatKwd(parseKwd("12.500"), "ar")).toContain("12.500");
  });

  it("produces a plain decimal string for inputs and exports", () => {
    expect(toDecimalString(parseKwd("12.5"))).toBe("12.500");
    expect(toDecimalString(fils(5))).toBe("0.005");
    expect(toDecimalString(fils(0))).toBe("0.000");
  });

  it("round-trips through parse and format", () => {
    // A ROUND-TRIP test: text → fils → text should return the original. It
    // catches whole categories of bug in one assertion, because any asymmetry
    // between the two functions shows up here.
    for (const value of ["0.001", "9.999", "150.000", "1234.567"]) {
      expect(toDecimalString(parseKwd(value))).toBe(value);
    }
  });
});
