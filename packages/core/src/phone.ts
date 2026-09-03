/**
 * Normalises a Kuwaiti phone number to E.164.
 *
 * People type "5133 8855", "+965 51338855" or "0096551338855" and all mean the
 * same number. Storing one canonical form is what lets a phone identify an
 * account reliably.
 */
// ── E.164 ──
// The international standard for phone numbers: a `+`, the country code, then
// the national number, with no spaces or punctuation. `+96551338855`.
//
// ── The return type `string | null` ──
// A union again: this returns EITHER a string OR `null`. TypeScript will
// force every caller to handle the null case before using the string — that
// is the whole point of writing it this way rather than returning `""`.
export function normalizeKuwaitPhone(input: string): string | null {
  // `[^\d]` is a NEGATED character class: `\d` means "a digit", and the `^`
  // inside the brackets flips it to "anything that is NOT a digit". With the
  // `g` (global) flag, this deletes every space, dash, plus and bracket.
  const digits = input.replace(/[^\d]/g, "");

  // ── A chained ternary ──
  // Read it as an if / else-if / else ladder:
  //
  //   if      (digits starts with "00965") → drop the first 5 characters
  //   else if (digits starts with "965")   → drop the first 3 characters
  //   else                                 → leave it alone
  //
  // `.slice(n)` returns the string from index n onward, leaving the original
  // untouched (JavaScript strings are immutable).
  //
  // Chained ternaries are dense. They are acceptable when every branch is a
  // simple mapping like this; reach for a real `if` as soon as a branch needs
  // more than one expression.
  const local = digits.startsWith("00965")
    ? digits.slice(5)
    : digits.startsWith("965")
      ? digits.slice(3)
      : digits;

  // Kuwaiti mobile numbers are 8 digits and start with 5, 6 or 9.
  //
  // `/^[569]\d{7}$/` reads as: from the start (`^`), one character that is 5,
  // 6 or 9, then exactly seven digits (`\d{7}`), then the end (`$`). The
  // anchors matter — without them this would match a valid number buried
  // inside a longer string of junk.
  //
  // `.test()` returns a plain boolean, unlike `.exec()` which returns the
  // match details. Use `.test()` when you only care whether it matched.
  if (!/^[569]\d{7}$/.test(local)) return null;
  return `+965${local}`;
}
