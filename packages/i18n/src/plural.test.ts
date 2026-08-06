import { describe, expect, it } from "vitest";
import { pluralForm } from "./plural";

describe("English plurals", () => {
  it("uses the singular only for exactly one", () => {
    expect(pluralForm(1, "en")).toBe("one");
    expect(pluralForm(0, "en")).toBe("other");
    expect(pluralForm(2, "en")).toBe("other");
    expect(pluralForm(213, "en")).toBe("other");
  });
});

describe("Arabic plurals", () => {
  it("has a dedicated zero and dual form", () => {
    expect(pluralForm(0, "ar")).toBe("zero");
    expect(pluralForm(1, "ar")).toBe("one");
    // Arabic has a dual — no English equivalent.
    expect(pluralForm(2, "ar")).toBe("two");
  });

  it("uses 'few' for 3 to 10", () => {
    expect(pluralForm(3, "ar")).toBe("few");
    expect(pluralForm(10, "ar")).toBe("few");
  });

  it("uses 'many' for 11 to 99", () => {
    expect(pluralForm(11, "ar")).toBe("many");
    expect(pluralForm(88, "ar")).toBe("many");
    expect(pluralForm(99, "ar")).toBe("many");
  });

  it("depends on n % 100, which is the part nobody guesses", () => {
    // 213 % 100 = 13, so it is "many" — not "other" as the magnitude suggests.
    expect(pluralForm(213, "ar")).toBe("many");
    // 105 % 100 = 5, which lands in the 3–10 band.
    expect(pluralForm(105, "ar")).toBe("few");
    // 100 % 100 = 0, which is none of the bands above.
    expect(pluralForm(100, "ar")).toBe("other");
  });
});
