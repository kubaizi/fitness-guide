// Testing framework basics are explained at the top of
// packages/core/src/money.test.ts.
import { describe, expect, it } from "vitest";
import { pluralForm } from "./plural";

// These tests are really documenting Intl's behaviour rather than testing our
// own code — `pluralForm` is a one-line wrapper. That is deliberate and
// worth the space: the Arabic rules are surprising, and having them written
// down as executable examples is far more use than a comment nobody trusts.
describe("English plurals", () => {
  it("uses the singular only for exactly one", () => {
    expect(pluralForm(1, "en")).toBe("one");
    // Note that zero is "other" in English — "0 gyms", not "0 gym".
    expect(pluralForm(0, "en")).toBe("other");
    expect(pluralForm(2, "en")).toBe("other");
    expect(pluralForm(213, "en")).toBe("other");
  });
});

describe("Arabic plurals", () => {
  it("has a dedicated zero and dual form", () => {
    // English collapses these three into two forms. Arabic keeps them apart,
    // which is why a naive `count === 1 ? singular : plural` is wrong here.
    expect(pluralForm(0, "ar")).toBe("zero");
    expect(pluralForm(1, "ar")).toBe("one");
    // Arabic has a dual — no English equivalent.
    expect(pluralForm(2, "ar")).toBe("two");
  });

  it("uses 'few' for 3 to 10", () => {
    // Testing both ends of the band. The interesting values in any range are
    // its boundaries — if the rule were off by one, 3 or 10 would catch it.
    expect(pluralForm(3, "ar")).toBe("few");
    expect(pluralForm(10, "ar")).toBe("few");
  });

  it("uses 'many' for 11 to 99", () => {
    expect(pluralForm(11, "ar")).toBe("many");
    expect(pluralForm(88, "ar")).toBe("many");
    expect(pluralForm(99, "ar")).toBe("many");
  });

  it("depends on n % 100, which is the part nobody guesses", () => {
    // This is the test to remember. The category is decided by the last two
    // digits, not by the size of the number — so intuition about "big
    // numbers use the other form" is simply wrong.
    //
    // 213 % 100 = 13, so it is "many" — not "other" as the magnitude suggests.
    expect(pluralForm(213, "ar")).toBe("many");
    // 105 % 100 = 5, which lands in the 3–10 band.
    expect(pluralForm(105, "ar")).toBe("few");
    // 100 % 100 = 0, which is none of the bands above.
    expect(pluralForm(100, "ar")).toBe("other");
  });
});
