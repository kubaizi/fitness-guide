/**
 * Normalises a Kuwaiti phone number to E.164.
 *
 * People type "5133 8855", "+965 51338855" or "0096551338855" and all mean the
 * same number. Storing one canonical form is what lets a phone identify an
 * account reliably.
 */
export function normalizeKuwaitPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");

  const local = digits.startsWith("00965")
    ? digits.slice(5)
    : digits.startsWith("965")
      ? digits.slice(3)
      : digits;

  // Kuwaiti mobile numbers are 8 digits and start with 5, 6 or 9.
  if (!/^[569]\d{7}$/.test(local)) return null;
  return `+965${local}`;
}
