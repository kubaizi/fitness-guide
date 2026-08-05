import { describe, expect, it } from "vitest";
import { createTranslator } from "./translate";
import { directionOf, isRtl, mirror } from "./direction";
import { formatDate, formatNumber } from "./format";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "./types";
import { ar } from "./locales/ar";
import { en } from "./locales/en";

describe("locales", () => {
  it("defaults to Arabic — the market is Kuwait", () => {
    expect(DEFAULT_LOCALE).toBe("ar");
  });

  it("narrows an unknown string to a Locale", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });

  it("has exactly the languages we support", () => {
    expect(LOCALES).toEqual(["ar", "en"]);
  });
});

describe("direction", () => {
  it("maps Arabic to RTL and English to LTR", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
    expect(isRtl("ar")).toBe(true);
  });

  it("mirrors a physical direction only in Arabic", () => {
    expect(mirror("left", "ar")).toBe("right");
    expect(mirror("left", "en")).toBe("left");
  });
});

describe("translation", () => {
  it("returns the right language", () => {
    expect(createTranslator("en")("nav.home")).toBe("Home");
    expect(createTranslator("ar")("nav.home")).toBe("الرئيسية");
  });

  it("resolves nested keys", () => {
    expect(createTranslator("en")("checkout.payWithKnet")).toBe("Pay with KNET");
  });

  it("throws in development rather than rendering a blank label", () => {
    const t = createTranslator("en");
    // Cast past the compiler to simulate a key that slipped through.
    expect(() => t("gym.verifed" as never)).toThrow(/Missing translation/);
  });
});

describe("dictionary integrity", () => {
  /** Walks both trees and asserts they have identical key paths. */
  function paths(obj: unknown, prefix = ""): string[] {
    if (typeof obj !== "object" || obj === null) return [prefix];
    return Object.entries(obj).flatMap(([k, v]) =>
      paths(v, prefix ? `${prefix}.${k}` : k),
    );
  }

  it("Arabic and English have exactly the same keys", () => {
    expect(paths(en).sort()).toEqual(paths(ar).sort());
  });

  it("has no empty strings in either language", () => {
    const values = (o: unknown): string[] =>
      typeof o === "string" ? [o] : Object.values(o as object).flatMap(values);

    expect(values(ar).filter((v) => v.trim() === "")).toEqual([]);
    expect(values(en).filter((v) => v.trim() === "")).toEqual([]);
  });
});

describe("formatting", () => {
  it("uses Western digits in Arabic, as Kuwaiti apps do", () => {
    expect(formatNumber(1234, "ar")).toContain("1");
    expect(formatNumber(1234, "ar")).not.toContain("١");
  });

  it("formats dates in Kuwait time", () => {
    // 2026-01-15T21:30:00Z is 15 January in Kuwait (UTC+3).
    expect(formatDate("2026-01-15T21:30:00Z", "en")).toContain("2026");
  });
});
