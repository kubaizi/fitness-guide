// Testing framework basics (describe / it / expect / matchers) are explained
// at the top of ./money.test.ts.
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
// Two modules tested in one file. Fine here because both are small and
// related — they are the two things a sign-in touches.
import { normalizeKuwaitPhone } from "./phone";

describe("password hashing", () => {
  it("never stores the password itself", () => {
    const { hash, salt } = hashPassword("123");
    expect(hash).not.toContain("123");
    // ── `.toMatch(/regex/)` ──
    // Asserts the string matches a regular expression. Here it pins the SHAPE
    // of the output rather than its exact value — which is the only option,
    // since the salt is random and the hash therefore unpredictable.
    //
    // `/^[0-9a-f]{128}$/` means: start, exactly 128 hexadecimal characters,
    // end. 64 bytes (KEY_LENGTH) rendered as hex is 128 characters, because
    // each byte becomes two hex digits.
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
    // Likewise 16 random bytes → 32 hex characters.
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
  });

  it("accepts the right password and rejects the wrong one", () => {
    const stored = hashPassword("correct-horse");
    expect(verifyPassword("correct-horse", stored)).toBe(true);
    // Case matters — "Correct-Horse" is a different password entirely.
    expect(verifyPassword("Correct-Horse", stored)).toBe(false);
    // The empty string must not slip through. Worth an explicit test: a
    // careless implementation with a falsy check could treat "" as a match.
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("salts each password separately, so identical passwords differ", () => {
    // This is the test that proves salting works. Same input, twice, and the
    // stored values must differ — otherwise one cracked hash would reveal
    // every account that chose the same password.
    const a = hashPassword("123");
    const b = hashPassword("123");
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
    // Both still verify against their own salt.
    expect(verifyPassword("123", a)).toBe(true);
    expect(verifyPassword("123", b)).toBe(true);
  });

  it("is deterministic when the salt is reused", () => {
    // `"0".repeat(32)` builds "0000...0" — a fixed salt, so the randomness is
    // removed and the underlying hash function can be checked for
    // determinism. Never do this outside a test.
    const a = hashPassword("123", "0".repeat(32));
    const b = hashPassword("123", "0".repeat(32));
    expect(a.hash).toBe(b.hash);
  });

  it("does not throw on a malformed stored hash", () => {
    // Corrupt data must produce "no" rather than a crash. A thrown exception
    // here would take down the login route for everyone, not just this user —
    // which is why verifyPassword wraps its work in a try/catch.
    expect(verifyPassword("123", { salt: "abc", hash: "not-hex" })).toBe(false);
  });
});

describe("normalizeKuwaitPhone", () => {
  it("accepts the many ways people write the same number", () => {
    // A TABLE-DRIVEN test: one loop over many inputs that must all produce
    // the same answer. Far better than six near-identical `it` blocks —
    // adding a new accepted format is one more line in the array.
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
    // `.toBeNull()` is the matcher for exactly `null`. Distinct from
    // `.toBeUndefined()` — JavaScript has both, and they are not equal under
    // `===`. This function's contract is null, so the test says null.
    expect(normalizeKuwaitPhone("1234567")).toBeNull(); // too short
    expect(normalizeKuwaitPhone("912345678")).toBeNull(); // too long
    expect(normalizeKuwaitPhone("21234567")).toBeNull(); // wrong first digit
    expect(normalizeKuwaitPhone("")).toBeNull();
    expect(normalizeKuwaitPhone("admin")).toBeNull(); // the admin signs in by username
  });
});
