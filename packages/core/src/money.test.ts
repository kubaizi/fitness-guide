import { describe, expect, it } from "vitest";
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
    expect(() => parseKwd("12.5000")).toThrow(); // four decimals is not a KWD amount
    expect(() => parseKwd("abc")).toThrow();
    expect(() => parseKwd("-5.000")).toThrow();
    expect(() => parseKwd("")).toThrow();
  });
});

describe("floating point safety", () => {
  it("avoids the error that makes float money wrong", () => {
    // The bug this whole module exists to prevent:
    expect(0.1 + 0.2).not.toBe(0.3);

    // In fils it is exact.
    expect(add(parseKwd("0.100"), parseKwd("0.200"))).toBe(parseKwd("0.300"));
  });

  it("stays exact across many additions", () => {
    let total = fils(0);
    for (let i = 0; i < 1000; i += 1) {
      total = add(total, parseKwd("0.001"));
    }
    expect(total).toBe(1000); // exactly 1.000 KWD
    expect(toDecimalString(total)).toBe("1.000");
  });
});

describe("arithmetic guards", () => {
  it("refuses fractional fils", () => {
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
    expect(fromDinars(12.5)).toBe(12_500);
    expect(fromDinars(0.0004)).toBe(0);
    expect(fromDinars(0.0006)).toBe(1);
  });
});

describe("splitCommission", () => {
  it("splits a clean amount", () => {
    const { platform, gym } = splitCommission(parseKwd("100.000"), 1500); // 15%
    expect(platform).toBe(15_000);
    expect(gym).toBe(85_000);
  });

  it("never loses or invents a fil, whatever the rate", () => {
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
    expect(parts).toEqual([334, 333, 333]);
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
    expect(formatKwd(parseKwd("12.500"), "en")).toContain("12.500");
    expect(formatKwd(parseKwd("12.500"), "ar")).toContain("12.500");
  });

  it("produces a plain decimal string for inputs and exports", () => {
    expect(toDecimalString(parseKwd("12.5"))).toBe("12.500");
    expect(toDecimalString(fils(5))).toBe("0.005");
    expect(toDecimalString(fils(0))).toBe("0.000");
  });

  it("round-trips through parse and format", () => {
    for (const value of ["0.001", "9.999", "150.000", "1234.567"]) {
      expect(toDecimalString(parseKwd(value))).toBe(value);
    }
  });
});
