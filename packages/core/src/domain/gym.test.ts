// Testing framework basics (describe / it / expect / matchers) are explained
// at the top of ../money.test.ts — read that file first if this is your
// introduction to the test suite.
import { describe, expect, it } from "vitest";
import { admits } from "./gym";

// A whole test file for one three-line function. That is proportionate: the
// rule it encodes is subtle, was already wrong once in this app, and is
// invisible when it breaks — a gym simply stops appearing in results and
// nobody gets an error.
describe("admits", () => {
  // Note how the arguments type-check themselves. `admits("men", "men")` is
  // accepted because "men" is a member of both `GymAccess` and `AccessFilter`,
  // but `admits("separate_sections", "separate_sections")` would not compile:
  // the second parameter is `AccessFilter`, which has no such value. The type
  // system rules out a whole class of nonsense test before it can be written.
  it("matches a single-sex gym to its own filter", () => {
    expect(admits("men", "men")).toBe(true);
    expect(admits("women", "women")).toBe(true);
  });

  it("does not show a men's gym to someone looking for a women's gym", () => {
    expect(admits("men", "women")).toBe(false);
    expect(admits("women", "men")).toBe(false);
  });

  /*
   * The rule that was actually wrong in the app: a gym with separate men's and
   * women's sections was hidden from BOTH filters, because the code compared
   * for exact equality.
   */
  // This is a REGRESSION TEST — one written in response to a real bug, so the
  // same mistake cannot return unnoticed. The comment above it records what
  // went wrong, which is what makes the test readable a year from now.
  it("shows a separate-sections gym under both men and women", () => {
    expect(admits("separate_sections", "men")).toBe(true);
    expect(admits("separate_sections", "women")).toBe(true);
  });

  it("does not offer a separate-sections gym as mixed", () => {
    expect(admits("separate_sections", "mixed")).toBe(false);
  });

  /*
   * Deliberate: picking "women" in this market means a women-only space.
   * Folding mixed gyms into that result would quietly break the expectation.
   */
  // Tests that assert a NEGATIVE are as valuable as the positive ones here.
  // Without this, a future "helpful" change that widened the women filter to
  // include mixed gyms would pass the whole suite.
  it("keeps mixed gyms out of the men-only and women-only results", () => {
    expect(admits("mixed", "men")).toBe(false);
    expect(admits("mixed", "women")).toBe(false);
    expect(admits("mixed", "mixed")).toBe(true);
  });
});
