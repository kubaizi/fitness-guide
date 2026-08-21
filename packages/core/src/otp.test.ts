import { describe, expect, it } from "vitest";
import {
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  checkOtp,
  generateOtp,
  hashOtp,
  normalizeKuwaitPhone,
  verifyOtpHash,
} from "./otp";

describe("generateOtp", () => {
  it("is always six digits, including when the number is small", () => {
    for (let i = 0; i < 500; i += 1) {
      const code = generateOtp();
      expect(code).toHaveLength(OTP_LENGTH);
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("does not obviously repeat", () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateOtp()));
    // 200 draws from a million values should almost never collide much.
    expect(seen.size).toBeGreaterThan(190);
  });
});

describe("hashing", () => {
  it("never stores the code itself", () => {
    const hash = hashOtp("123456", "+96591234567");
    expect(hash).not.toContain("123456");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("binds the hash to the phone number", () => {
    // Same code, different number — must not collide.
    expect(hashOtp("123456", "+96591234567")).not.toBe(hashOtp("123456", "+96599999999"));
  });

  it("verifies correctly", () => {
    const phone = "+96591234567";
    const hash = hashOtp("654321", phone);
    expect(verifyOtpHash("654321", phone, hash)).toBe(true);
    expect(verifyOtpHash("654322", phone, hash)).toBe(false);
  });

  it("rejects a malformed stored hash without throwing", () => {
    expect(verifyOtpHash("123456", "+96591234567", "deadbeef")).toBe(false);
  });
});

describe("normalizeKuwaitPhone", () => {
  it("accepts the many ways people write the same number", () => {
    const expected = "+96591234567";
    for (const input of [
      "91234567",
      "9123 4567",
      "+965 91234567",
      "+96591234567",
      "0096591234567",
      "965-9123-4567",
    ]) {
      expect(normalizeKuwaitPhone(input)).toBe(expected);
    }
  });

  it("rejects numbers that are not Kuwaiti mobiles", () => {
    expect(normalizeKuwaitPhone("1234567")).toBeNull(); // too short
    expect(normalizeKuwaitPhone("912345678")).toBeNull(); // too long
    expect(normalizeKuwaitPhone("21234567")).toBeNull(); // landline prefix
    expect(normalizeKuwaitPhone("")).toBeNull();
    expect(normalizeKuwaitPhone("not a phone")).toBeNull();
  });
});

describe("checkOtp", () => {
  const phone = "+96591234567";
  const code = "246813";
  const base = {
    code,
    phone,
    storedHash: hashOtp(code, phone),
    expiresAt: new Date("2026-01-01T00:05:00Z"),
    attempts: 0,
    consumedAt: null,
    now: new Date("2026-01-01T00:00:00Z"),
  };

  it("accepts a correct, fresh code", () => {
    expect(checkOtp(base)).toEqual({ ok: true });
  });

  it("rejects a wrong code", () => {
    expect(checkOtp({ ...base, code: "000000" })).toEqual({
      ok: false,
      reason: "mismatch",
    });
  });

  it("rejects an expired code even when it is correct", () => {
    const now = new Date("2026-01-01T00:05:01Z");
    expect(checkOtp({ ...base, now })).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a code that was already used", () => {
    const consumedAt = new Date("2026-01-01T00:01:00Z");
    expect(checkOtp({ ...base, consumedAt })).toEqual({ ok: false, reason: "consumed" });
  });

  it("locks out after the attempt cap", () => {
    expect(checkOtp({ ...base, attempts: OTP_MAX_ATTEMPTS })).toEqual({
      ok: false,
      reason: "locked",
    });
  });

  it("checks lockout BEFORE comparing, so guessing past the cap reveals nothing", () => {
    // Correct code, but locked — must still refuse, and for the lockout reason.
    expect(checkOtp({ ...base, attempts: OTP_MAX_ATTEMPTS })).toEqual({
      ok: false,
      reason: "locked",
    });
  });

  it("checks expiry before comparing too", () => {
    const now = new Date("2026-01-01T01:00:00Z");
    expect(checkOtp({ ...base, code: "000000", now })).toEqual({
      ok: false,
      reason: "expired",
    });
  });
});
