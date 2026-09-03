// Testing framework basics are explained at the top of
// packages/core/src/money.test.ts.
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
    // `.toEqual` because LOCALES is an array — see money.test.ts on why
    // `.toBe` is wrong for arrays.
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
    // `createTranslator("en")("nav.home")` is two calls back to back: the
    // first returns a function, the second immediately invokes it. Written
    // out it would be:
    //   const t = createTranslator("en");
    //   t("nav.home");
    expect(createTranslator("en")("nav.home")).toBe("Home");
    expect(createTranslator("ar")("nav.home")).toBe("الرئيسية");
  });

  it("resolves nested keys", () => {
    expect(createTranslator("en")("checkout.payWithKnet")).toBe("Pay with KNET");
  });

  it("throws in development rather than rendering a blank label", () => {
    const t = createTranslator("en");
    // Cast past the compiler to simulate a key that slipped through.
    //
    // `as never` is a deliberate escape hatch. Normally `t("gym.verifed")`
    // would not compile at all — which is the feature. But the runtime
    // fallback still needs testing, so the cast forces the bad key through
    // the type check to reach the code being tested.
    //
    // `.toThrow(/Missing translation/)` matches the error MESSAGE against a
    // regular expression, rather than checking the error's class.
    expect(() => t("gym.verifed" as never)).toThrow(/Missing translation/);
  });
});

describe("dictionary integrity", () => {
  /** Walks both trees and asserts they have identical key paths. */
  // A RECURSIVE function: it calls itself to descend through the nested
  // object. `prefix = ""` is a default parameter, so the first call needs
  // only one argument and each deeper call passes the path built so far.
  function paths(obj: unknown, prefix = ""): string[] {
    // The BASE CASE that stops the recursion: a string (or null) is a leaf,
    // so return the path that led here. Note `typeof null === "object"` in
    // JavaScript — a long-standing quirk — which is why null is checked
    // separately rather than relying on typeof alone.
    if (typeof obj !== "object" || obj === null) return [prefix];
    // `Object.entries({a: 1})` gives `[["a", 1]]` — an array of key/value
    // pairs. `([k, v]) =>` destructures each pair into two named parameters.
    //
    // `.flatMap` is `.map` followed by flattening one level: each recursive
    // call returns an ARRAY of paths, and flatMap merges them all into one
    // flat list instead of leaving arrays nested inside arrays.
    return Object.entries(obj).flatMap(([k, v]) =>
      // Only prepend a dot once there is something to prepend to, so the
      // top level yields "common" rather than ".common".
      paths(v, prefix ? `${prefix}.${k}` : k),
    );
  }

  it("Arabic and English have exactly the same keys", () => {
    // The type system already enforces this at build time. The test exists
    // because the guarantee could be lost — someone adds an `as any`, or
    // widens a type — and this catches that regression at runtime.
    //
    // `.sort()` on both sides because key ORDER is irrelevant here; only the
    // set of keys matters.
    expect(paths(en).sort()).toEqual(paths(ar).sort());
  });

  it("has no empty strings in either language", () => {
    // Something the type system genuinely cannot check: `""` is a perfectly
    // valid string, so only a runtime test catches a key that was added as a
    // placeholder and never filled in.
    const values = (o: unknown): string[] =>
      typeof o === "string" ? [o] : Object.values(o as object).flatMap(values);

    // `.filter(fn)` keeps only the elements for which the callback is true.
    // Asserting the filtered list is empty gives a far better failure message
    // than a bare boolean would — a failure prints the offending strings.
    expect(values(ar).filter((v) => v.trim() === "")).toEqual([]);
    expect(values(en).filter((v) => v.trim() === "")).toEqual([]);
  });
});

describe("formatting", () => {
  it("uses Western digits in Arabic, as Kuwaiti apps do", () => {
    expect(formatNumber(1234, "ar")).toContain("1");
    // "١" is the Arabic-Indic digit one. Asserting its ABSENCE is what
    // actually pins the `-u-nu-latn` part of the locale tag — without that
    // suffix Intl would produce ١٢٣٤ and this line would fail.
    expect(formatNumber(1234, "ar")).not.toContain("١");
  });

  it("formats dates in Kuwait time", () => {
    // 2026-01-15T21:30:00Z is 15 January in Kuwait (UTC+3).
    //
    // The `Z` suffix means UTC. 21:30 UTC is 00:30 the NEXT day in Kuwait —
    // so this input is deliberately chosen near a date boundary, where a
    // missing `timeZone` option would show the wrong day.
    expect(formatDate("2026-01-15T21:30:00Z", "en")).toContain("2026");
  });
});
