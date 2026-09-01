import { describe, expect, it } from "vitest";
import { admits } from "./gym";

describe("admits", () => {
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
  it("keeps mixed gyms out of the men-only and women-only results", () => {
    expect(admits("mixed", "men")).toBe(false);
    expect(admits("mixed", "women")).toBe(false);
    expect(admits("mixed", "mixed")).toBe(true);
  });
});
