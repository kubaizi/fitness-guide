import { crc32, deflateSync } from "node:zlib";

// Emad's own filled-in profile, so the private sections can be looked at with
// something in them.
//
// Kept apart from seed.mjs because it is a different KIND of data. The JSON
// files describe the marketplace — gyms, plans, memberships — and everything
// here belongs to one person: his photos, his health answers, his report.
// Mixing them would put a demo account's private data in files that otherwise
// read like reference data.
//
// Everything below is invented. No real allergy, injury or medicine.

/**
 * A small solid-colour PNG, generated rather than committed.
 *
 * Progress photos are the one thing here that cannot be written as text, and
 * putting real photographs of a person into a repository — even a demo one —
 * is not something to do lightly. So each is generated: a coloured square,
 * which is enough to watch the gallery lay out, crop, and delete.
 *
 * ## Why PNG and not JPEG
 *
 * A JPEG has to be assembled from quantisation and Huffman tables, and one
 * wrong byte gives you a file that looks plausible and decodes to nothing. A
 * PNG is four chunks with a CRC on each, and the compression is ordinary zlib,
 * which Node has built in. It is the format you can be sure you got right.
 *
 * ## The parts
 *
 *   signature  eight fixed bytes that say "this is a PNG"
 *   IHDR       width, height, bit depth, colour type
 *   IDAT       the pixels, zlib-compressed
 *   IEND       the end marker
 *
 * Each chunk is: length, type, data, CRC of (type + data).
 */
function solidPng(size, [r, g, b]) {
  const chunk = (type, data) => {
    const out = Buffer.alloc(data.length + 12);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, "ascii");
    data.copy(out, 8);
    // The CRC covers the type and the data, but NOT the length — a detail that
    // is easy to get wrong and produces a file every decoder rejects.
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)) >>> 0, 8 + data.length);
    return out;
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth: 8 bits per channel
  ihdr[9] = 2; // colour type 2: truecolour RGB, no alpha
  // bytes 10-12 stay zero: deflate compression, standard filtering, no interlace

  // Raw pixel data. Every scanline is preceded by a filter byte, and 0 means
  // "no filtering" — the one case where the bytes are just the pixels.
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.concat(Array.from({ length: size }, () => Buffer.from([r, g, b]))),
  ]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  return `data:image/png;base64,${png.toString("base64")}`;
}

/** Three invented progress photos, in the order they were taken. */
export const PHOTOS = [
  { image: solidPng(64, [86, 104, 128]), takenOn: "2026-06-01", note: "بداية البرنامج" },
  { image: solidPng(64, [104, 128, 96]), takenOn: "2026-07-15", note: "بعد ٦ أسابيع" },
  { image: solidPng(64, [140, 150, 116]), takenOn: "2026-09-01", note: "بعد ٣ أشهر" },
];

/** Invented health answers, written in Arabic the way a member would write. */
export const MEDICAL = {
  allergies: "حساسية من البنسلين. لا توجد حساسية طعام.",
  disabilities: "لا يوجد.",
  chronicInjuries: "إصابة قديمة في الركبة اليمنى — أتجنب القرفصاء العميق.",
  medications: "فيتامين د ٥٠٠٠ وحدة أسبوعياً.",
  bloodType: "O+",
  notes: "أفضّل التمرين الصباحي. لا أرفع أوزاناً ثقيلة بدون مدرب.",
};

/** One invented report, as a minimal but real PDF. */
// Enough bytes for the browser to recognise the type and open it in a tab. The
// point of the row is that Open and Delete work, not that there is anything to
// read inside.
export const REPORT = {
  title: "تحليل دم — مارس ٢٠٢٦",
  kind: "pdf",
  content: `data:application/pdf;base64,${Buffer.from(
    "%PDF-1.4\n" +
      "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
      "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
      "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n" +
      "trailer<</Root 1 0 R>>\n%%EOF\n",
  ).toString("base64")}`,
};

/** A few weighings, so the log has a trend rather than one number. */
export const WEIGHTS = [
  { grams: 86400, measuredOn: "2026-06-01" },
  { grams: 84900, measuredOn: "2026-07-01" },
  { grams: 83200, measuredOn: "2026-08-01" },
  { grams: 82500, measuredOn: "2026-09-01" },
];
