import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { normalizeKuwaitPhone } from "./phone";

describe("password hashing", () => {
  it("never stores the password itself", () => {
    const { hash, salt } = hashPassword("123");
    expect(hash).not.toContain("123");
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
  });

  it("accepts the right password and rejects the wrong one", () => {
    const stored = hashPassword("correct-horse");
    expect(verifyPassword("correct-horse", stored)).toBe(true);
    expect(verifyPassword("Correct-Horse", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("salts each password separately, so identical passwords differ", () => {
    const a = hashPassword("123");
    const b = hashPassword("123");
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
    // Both still verify against their own salt.
    expect(verifyPassword("123", a)).toBe(true);
    expect(verifyPassword("123", b)).toBe(true);
  });

  it("is deterministic when the salt is reused", () => {
    const a = hashPassword("123", "0".repeat(32));
    const b = hashPassword("123", "0".repeat(32));
    expect(a.hash).toBe(b.hash);
  });

  it("does not throw on a malformed stored hash", () => {
    expect(verifyPassword("123", { salt: "abc", hash: "not-hex" })).toBe(false);
  });
});

describe("normalizeKuwaitPhone", () => {
  it("accepts the many ways people write the same number", () => {
    for (const input of [
      "51338855",
      "5133 8855",
      "+965 51338855",
      "+96551338855",
      "0096551338855",
      "965-5133-8855",
    ]) {
      expect(normalizeKuwaitPhone(input)).toBe("+96551338855");
    }
  });

  it("handles the other demo number too", () => {
    expect(normalizeKuwaitPhone("50946363")).toBe("+96550946363");
  });

  it("rejects anything that is not a Kuwaiti mobile", () => {
    expect(normalizeKuwaitPhone("1234567")).toBeNull();
    expect(normalizeKuwaitPhone("912345678")).toBeNull();
    expect(normalizeKuwaitPhone("21234567")).toBeNull();
    expect(normalizeKuwaitPhone("")).toBeNull();
    expect(normalizeKuwaitPhone("admin")).toBeNull();
  });
});
