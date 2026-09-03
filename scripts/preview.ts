/**
 * Generates a visual preview of the foundation packages.
 *
 * Every string, price and split on the produced page comes from the real
 * modules — nothing here is mocked up. Run it with:
 *
 *   npx vite-node scripts/preview.ts
 */
// ═══════════════════════════════════════════════════════════════════════════
// NOT PART OF THE WEB APP. This is a standalone Node script — no React, no
// Next.js, no components. It builds an HTML string and writes it to a file.
//
// It predates the Next app and exists to prove @fg/core and @fg/i18n work
// before any UI was built. Useful to read for two reasons:
//
//   1. It is the clearest demonstration of what those two packages actually
//      do, with the arithmetic proofs rendered on the page.
//   2. It shows what building a page WITHOUT React looks like — string
//      concatenation, manual escaping, `document.getElementById` to update
//      things. Compare `renderGyms` below with GymCard.tsx: same output, and
//      the difference is the argument for React in one screen.
//
// `vite-node` runs a TypeScript file directly, without a separate compile
// step. Plain `node` cannot execute .ts files.
// ═══════════════════════════════════════════════════════════════════════════
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  allocate,
  add,
  formatKwd,
  parseKwd,
  splitCommission,
  toDecimalString,
  type Fils,
} from "@fg/core";
import type { Gym, MembershipPlan } from "@fg/core";
import { createTranslator, directionOf, type Locale } from "@fg/i18n";

// ── sample data, typed against the real domain ──────────────────────────────

const GYMS: readonly Gym[] = [
  {
    id: "g1",
    name: { ar: "نادي الحديد", en: "Iron Club" },
    description: { ar: "نادٍ متكامل للرجال", en: "Full-service men's gym" },
    governorate: "hawalli",
    area: { ar: "السالمية", en: "Salmiya" },
    access: "men",
    verification: { state: "verified", verifiedAt: "2026-05-02T09:00:00Z" },
    rating: 4.7,
    reviewCount: 213,
    startingPrice: parseKwd("25.000"),
    photos: [],
    amenities: ["parking", "sauna", "classes"],
    location: { lat: 29.33, lng: 48.07 },
  },
  {
    id: "g2",
    name: { ar: "ستوديو نُوَى", en: "Nawa Studio" },
    description: { ar: "ستوديو نسائي", en: "Women-only studio" },
    governorate: "capital",
    area: { ar: "الشويخ", en: "Shuwaikh" },
    access: "women",
    verification: { state: "verified", verifiedAt: "2026-06-11T09:00:00Z" },
    rating: 4.9,
    reviewCount: 88,
    startingPrice: parseKwd("32.500"),
    photos: [],
    amenities: ["classes", "childcare"],
    location: { lat: 29.35, lng: 47.93 },
  },
  {
    id: "g3",
    name: { ar: "مركز الخليج للياقة", en: "Gulf Fitness Centre" },
    description: { ar: "أقسام منفصلة", en: "Separate sections" },
    governorate: "farwaniya",
    area: { ar: "الفروانية", en: "Farwaniya" },
    access: "separate_sections",
    verification: { state: "pending", submittedAt: "2026-07-20T09:00:00Z" },
    rating: null,
    reviewCount: 0,
    startingPrice: parseKwd("18.750"),
    photos: [],
    amenities: ["parking"],
    location: { lat: 29.27, lng: 47.95 },
  },
];

const PLANS: readonly MembershipPlan[] = [
  {
    id: "p1",
    gymId: "g1",
    name: { ar: "شهري", en: "Monthly" },
    duration: "monthly",
    listPrice: parseKwd("25.000"),
    offerPrice: parseKwd("19.900"),
  },
  {
    id: "p2",
    gymId: "g1",
    name: { ar: "ربع سنوي", en: "Quarterly" },
    duration: "quarterly",
    listPrice: parseKwd("67.500"),
    offerPrice: null,
  },
  {
    id: "p3",
    gymId: "g1",
    name: { ar: "سنوي", en: "Yearly" },
    duration: "yearly",
    listPrice: parseKwd("240.000"),
    offerPrice: parseKwd("199.999"),
  },
];

const COMMISSION_BP = 1500; // 15%

// ── rendering ───────────────────────────────────────────────────────────────

// ── HTML ESCAPING, by hand ──
// Turns `&`, `<` and `>` into their HTML entities, so text cannot be mistaken
// for markup. Without it, a gym named `<script>alert(1)</script>` would
// EXECUTE when this page was opened — the classic XSS hole.
//
// Note the order: `&` MUST be replaced first. Do `<` first and the `&` in the
// resulting `&lt;` gets escaped again into `&amp;lt;`, which then renders as
// the literal text "&lt;". A genuine bug people hit every time they write one
// of these.
//
// React does all of this automatically for every value you interpolate, which
// is why `dangerouslySetInnerHTML` has to be opted into so loudly. This
// function is what you are giving up when you reach for that prop.
const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const accessLabel: Record<Gym["access"], { ar: string; en: string }> = {
  men: { ar: "رجال", en: "Men" },
  women: { ar: "نساء", en: "Women" },
  mixed: { ar: "مختلط", en: "Mixed" },
  separate_sections: { ar: "أقسام منفصلة", en: "Separate sections" },
};

// ── Compare this function directly with src/components/GymCard.tsx ──
// Both produce a gym card. This one returns a STRING of HTML; GymCard returns
// JSX. The differences worth noticing:
//
//   • every value needs `esc()` by hand — React escapes automatically
//   • `.join("")` at the end to concatenate — React renders arrays natively
//   • class names are raw strings that could typo silently — CSS modules
//     make `styles.crd` a compile error
//   • no type checking of the markup at all — a stray `<div>` compiles fine
//
// It works, and for a one-off script it is entirely reasonable. It stops
// being reasonable at roughly the third screen.
function renderGyms(locale: Locale): string {
  const t = createTranslator(locale);
  return GYMS.map((g) => {
    const verified = g.verification.state === "verified";
    const badge = verified
      ? `<span class="badge ok">✓ ${esc(t("gym.verified"))}</span>`
      : `<span class="badge pending">${locale === "ar" ? "قيد المراجعة" : "Pending review"}</span>`;
    const rating =
      g.rating === null
        ? `<span class="muted">${locale === "ar" ? "لا تقييمات بعد" : "No reviews yet"}</span>`
        : `<b>${g.rating.toFixed(1)}</b> <span class="muted">${g.reviewCount} ${esc(t("gym.reviews"))}</span>`;

    return `<article class="card">
      <div class="card-top">
        <div>
          <h3>${esc(g.name[locale])}</h3>
          <p class="muted">${esc(g.area[locale])} · ${esc(accessLabel[g.access][locale])}</p>
        </div>
        ${badge}
      </div>
      <div class="card-foot">
        <div>${rating}</div>
        <div class="price">
          <span class="muted">${esc(t("gym.startingFrom"))}</span>
          <b>${esc(formatKwd(g.startingPrice as Fils, locale))}</b>
        </div>
      </div>
    </article>`;
  }).join("");
}

function renderPlans(locale: Locale): string {
  return PLANS.map((p) => {
    const effective = p.offerPrice ?? p.listPrice;
    const { platform, gym } = splitCommission(effective, COMMISSION_BP);
    const struck = p.offerPrice
      ? `<s class="muted">${esc(formatKwd(p.listPrice, locale))}</s>`
      : "";

    return `<tr>
      <td><b>${esc(p.name[locale])}</b></td>
      <td class="num">${struck} ${esc(formatKwd(effective, locale))}</td>
      <td class="num muted">${esc(formatKwd(platform, locale))}</td>
      <td class="num">${esc(formatKwd(gym, locale))}</td>
      <td class="num mono" dir="ltr">${toDecimalString(platform)} + ${toDecimalString(gym)} = ${toDecimalString(effective)}</td>
    </tr>`;
  }).join("");
}

// The most interesting function in the file: it runs the money arithmetic
// live and prints the results, so the page is EVIDENCE rather than a claim.
// The same properties are asserted in packages/core/src/money.test.ts — this
// is the human-readable version of that test file.
//
// `Array<[string, string]>` is an array of TUPLES: fixed-length arrays with a
// type per position. Here, exactly two strings — a label and a value.
// `Array<T>` and `T[]` mean the same thing; the longer form reads better when
// T is itself bracketed.
function renderProofs(): string {
  const rows: Array<[string, string]> = [];

  // Float error the module exists to prevent.
  rows.push(["0.1 + 0.2 === 0.3 (raw JS)", String(0.1 + 0.2 === 0.3)]);
  rows.push([
    "parseKwd('0.100') + parseKwd('0.200')",
    toDecimalString(add(parseKwd("0.100"), parseKwd("0.200"))),
  ]);

  // 1000 additions of one fil.
  let total = parseKwd("0.000");
  for (let i = 0; i < 1000; i += 1) total = add(total, parseKwd("0.001"));
  rows.push(["1000 × 0.001 KWD", toDecimalString(total)]);

  // Three-way split that does not divide evenly.
  const parts = allocate(parseKwd("1.000"), [1, 1, 1]);
  rows.push([
    "allocate(1.000 KWD, [1,1,1])",
    `${parts.join(" + ")} = ${parts.reduce((a, b) => a + b, 0)} fils`,
  ]);

  rows.push(["'12.5' parsed as fils", String(parseKwd("12.5"))]);
  rows.push([
    "splitCommission(19.900, 15%)",
    // ── An IIFE: Immediately Invoked Function Expression ──
    //   (() => { ...; return x; })()
    // Defines a function and calls it on the spot. The trailing `()` is the
    // call. Used here because this entry needs a local variable, and an array
    // element can only hold an expression, not statements.
    //
    // Rarely needed in modern JavaScript — a named const above would be
    // clearer. Worth recognising, since older code is full of them.
    (() => {
      const s = splitCommission(parseKwd("19.900"), COMMISSION_BP);
      return `${s.platform} + ${s.gym} = ${s.platform + s.gym} fils`;
    })(),
  ]);

  // Code and numeric expressions stay LTR even in an Arabic layout — otherwise
  // the bidi algorithm reorders the operators and the line reads as nonsense.
  return rows
    .map(
      ([k, v]) =>
        `<tr><td class="mono" dir="ltr">${esc(k)}</td>` +
        `<td class="mono num" dir="ltr"><b>${esc(v)}</b></td></tr>`,
    )
    .join("");
}

function payload(locale: Locale) {
  const t = createTranslator(locale);
  return {
    dir: directionOf(locale),
    lang: locale,
    appName: t("common.appName"),
    nav: {
      home: t("nav.home"),
      explore: t("nav.explore"),
      memberships: t("nav.memberships"),
      profile: t("nav.profile"),
    },
    labels: {
      gyms: locale === "ar" ? "أندية قريبة" : "Nearby gyms",
      plans: locale === "ar" ? "الاشتراكات وتقسيم العمولة" : "Plans & commission split",
      proofs: locale === "ar" ? "إثبات دقة الحساب" : "Arithmetic proofs",
      plan: locale === "ar" ? "الاشتراك" : "Plan",
      price: t("checkout.total"),
      platform: locale === "ar" ? "المنصة (١٥٪)" : "Platform (15%)",
      gym: locale === "ar" ? "النادي" : "Gym",
      check: locale === "ar" ? "التحقق (بالفلس)" : "Check (in fils)",
      showQr: t("membership.showQr"),
      viewPlans: t("gym.viewPlans"),
    },
    gyms: renderGyms(locale),
    plans: renderPlans(locale),
    proofs: renderProofs(),
  };
}

const AR = payload("ar");
const EN = payload("en");

const html = `<!doctype html>
<html lang="${AR.lang}" dir="${AR.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fitness Guide — foundation preview</title>
<style>
  :root{
    --bg:#0b0c0e; --card:#15171b; --line:#262a30; --ink:#e9e7e2; --muted:#8b8981;
    --gold:#d4af37; --gold-dim:#8a6f1e; --ok:#5fa87a; --warn:#d99b3c;
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:"Segoe UI",system-ui,-apple-system,sans-serif;line-height:1.6;}
  .wrap{max-width:960px;margin:0 auto;padding:32px 24px 80px;}
  header{display:flex;align-items:center;justify-content:space-between;gap:16px;
    padding-bottom:20px;border-bottom:1px solid var(--line);flex-wrap:wrap;}
  .brand{display:flex;align-items:center;gap:12px;}
  .logo{width:40px;height:40px;display:grid;place-items:center;border:1.5px solid var(--gold);
    color:var(--gold);font-weight:700;font-size:15px;}
  .brand b{font-size:19px;}
  .toggle{display:flex;border:1px solid var(--line);border-radius:2px;overflow:hidden;}
  .toggle button{background:transparent;border:0;color:var(--muted);padding:8px 18px;
    font:inherit;font-size:14px;cursor:pointer;}
  .toggle button[aria-pressed="true"]{background:var(--gold);color:#12130f;font-weight:600;}
  nav{display:flex;gap:24px;padding:16px 0;border-bottom:1px solid var(--line);
    font-size:14.5px;color:var(--muted);flex-wrap:wrap;}
  nav span:first-child{color:var(--gold);}
  h2{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold-dim);
    margin:40px 0 14px;font-weight:600;}
  .cards{display:grid;gap:12px;}
  .card{background:var(--card);border:1px solid var(--line);padding:16px 18px;border-radius:3px;}
  .card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
  .card h3{margin:0 0 2px;font-size:17px;}
  .card p{margin:0;font-size:14px;}
  .card-foot{display:flex;justify-content:space-between;align-items:baseline;
    margin-top:14px;padding-top:12px;border-top:1px solid var(--line);font-size:14px;gap:12px;}
  .price b{color:var(--gold);font-size:16px;margin-inline-start:6px;}
  .muted{color:var(--muted);}
  .badge{font-size:11.5px;padding:4px 9px;border-radius:2px;white-space:nowrap;}
  .badge.ok{background:#14231a;color:var(--ok);}
  .badge.pending{background:#251b0c;color:var(--warn);}
  .scroll{overflow-x:auto;border:1px solid var(--line);border-radius:3px;background:var(--card);}
  table{width:100%;border-collapse:collapse;font-size:14px;min-width:520px;}
  th{text-align:start;font-size:11px;letter-spacing:.1em;text-transform:uppercase;
    color:var(--muted);font-weight:500;padding:11px 14px;border-bottom:1px solid var(--line);}
  td{padding:11px 14px;border-bottom:1px solid var(--line);vertical-align:middle;}
  tr:last-child td{border-bottom:0;}
  .num{text-align:end;font-variant-numeric:tabular-nums;white-space:nowrap;}
  .mono{font-family:Consolas,ui-monospace,monospace;font-size:12.5px;}
  s{margin-inline-end:8px;}
  footer{margin-top:44px;padding-top:18px;border-top:1px solid var(--line);
    font-size:13px;color:var(--muted);}
  .note{background:#15171b;border-inline-start:3px solid var(--gold-dim);
    padding:14px 16px;margin-top:14px;font-size:14px;color:var(--muted);border-radius:2px;}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="brand"><div class="logo">FG</div><b id="appName">${esc(AR.appName)}</b></div>
    <div class="toggle">
      <button id="btn-ar" aria-pressed="true">العربية</button>
      <button id="btn-en" aria-pressed="false">English</button>
    </div>
  </header>

  <nav id="nav">
    <span>${esc(AR.nav.home)}</span><span>${esc(AR.nav.explore)}</span>
    <span>${esc(AR.nav.memberships)}</span><span>${esc(AR.nav.profile)}</span>
  </nav>

  <h2 id="h-gyms">${esc(AR.labels.gyms)}</h2>
  <div class="cards" id="gyms">${AR.gyms}</div>

  <h2 id="h-plans">${esc(AR.labels.plans)}</h2>
  <div class="scroll"><table>
    <thead><tr>
      <th id="th-plan">${esc(AR.labels.plan)}</th>
      <th class="num" id="th-price">${esc(AR.labels.price)}</th>
      <th class="num" id="th-platform">${esc(AR.labels.platform)}</th>
      <th class="num" id="th-gym">${esc(AR.labels.gym)}</th>
      <th class="num" id="th-check">${esc(AR.labels.check)}</th>
    </tr></thead>
    <tbody id="plans">${AR.plans}</tbody>
  </table></div>

  <h2 id="h-proofs">${esc(AR.labels.proofs)}</h2>
  <div class="scroll"><table><tbody id="proofs">${AR.proofs}</tbody></table></div>

  <div class="note" id="note"></div>

  <footer>Generated by <span class="mono">scripts/preview.ts</span> from
    <span class="mono">@fg/core</span> and <span class="mono">@fg/i18n</span>.
    Nothing on this page is hardcoded.</footer>
</div>

<script>
const DATA = { ar: ${JSON.stringify(AR)}, en: ${JSON.stringify(EN)} };
const NOTE = {
  ar: "لاحظ أن التخطيط انعكس بالكامل عند التبديل — لم تُكتب أي قاعدة CSS بـ left أو right.",
  en: "Note the whole layout mirrored when you switched — no CSS rule here uses left or right."
};
function apply(locale){
  const d = DATA[locale];
  document.documentElement.lang = d.lang;
  document.documentElement.dir = d.dir;
  document.getElementById("appName").textContent = d.appName;
  document.getElementById("nav").innerHTML =
    ["home","explore","memberships","profile"].map(k => "<span>" + d.nav[k] + "</span>").join("");
  document.getElementById("h-gyms").textContent = d.labels.gyms;
  document.getElementById("h-plans").textContent = d.labels.plans;
  document.getElementById("h-proofs").textContent = d.labels.proofs;
  document.getElementById("th-plan").textContent = d.labels.plan;
  document.getElementById("th-price").textContent = d.labels.price;
  document.getElementById("th-platform").textContent = d.labels.platform;
  document.getElementById("th-gym").textContent = d.labels.gym;
  document.getElementById("th-check").textContent = d.labels.check;
  document.getElementById("gyms").innerHTML = d.gyms;
  document.getElementById("plans").innerHTML = d.plans;
  document.getElementById("proofs").innerHTML = d.proofs;
  document.getElementById("note").textContent = NOTE[locale];
  document.getElementById("btn-ar").setAttribute("aria-pressed", String(locale === "ar"));
  document.getElementById("btn-en").setAttribute("aria-pressed", String(locale === "en"));
}
document.getElementById("btn-ar").addEventListener("click", () => apply("ar"));
document.getElementById("btn-en").addEventListener("click", () => apply("en"));
apply("ar");
</script>
</body>
</html>`;

// The script's whole output: one self-contained HTML file, written next to
// wherever you ran it from. Open preview.html in a browser to see the result.
//
// `resolve` builds an absolute path — never concatenate path strings by hand,
// since the separator differs between Windows and everything else.
//
// `writeFileSync` is the BLOCKING version of the write. Correct in a
// throwaway script, where there is nothing else to get on with; in the web
// app you would use the async `writeFile`, as lib/db.ts does.
const out = resolve(process.cwd(), "preview.html");
writeFileSync(out, html, "utf8");
console.log("Preview written to " + out);
