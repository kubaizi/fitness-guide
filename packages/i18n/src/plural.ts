import type { Locale } from "./types";

/**
 * Which plural form a count needs.
 *
 * English has two forms ("1 gym" / "2 gyms"), so it is tempting to just append
 * an "s". Arabic has SIX, and they are not intuitive:
 *
 *   0    zero  →  أندية
 *   1    one   →  نادٍ
 *   2    two   →  ناديان     (a dedicated dual form — no English equivalent)
 *   3–10 few   →  أندية
 *   11–99 many →  نادياً
 *   100+ other →  نادٍ
 *
 * Note it depends on `n % 100`, so 213 is "many", not "other". Nobody gets
 * this right by hand, so we defer to Intl.PluralRules, which ships with the
 * platform and already knows the CLDR rules for every locale.
 */
// `Intl.LDMLPluralRule` is a type provided by TypeScript's built-in library
// definitions. It is the union
// `"zero" | "one" | "two" | "few" | "many" | "other"` — the six category
// names defined by CLDR (Unicode's Common Locale Data Repository, the
// reference dataset every platform uses for this).
//
// Aliasing it gives the codebase a name of its own to depend on, so call
// sites do not all reference `Intl.*` directly.
export type PluralForm = Intl.LDMLPluralRule;

// ── `Record<Locale, Intl.PluralRules>` ──
//
// `Record<K, V>` is a built-in utility type meaning "an object whose keys are
// K and whose values are V". Here that is `{ ar: Intl.PluralRules; en: ... }`.
//
// The important part: because `Locale` is exactly "ar" | "en", TypeScript
// requires BOTH keys. Add a third locale to types.ts and this object stops
// compiling until you add its rules too — the type does the remembering.
//
// The two `new Intl.PluralRules(...)` objects are created once, when this
// module is first imported, and reused for every call. Constructing them is
// comparatively expensive, so building one per call inside `pluralForm`
// would be a real waste.
const RULES: Record<Locale, Intl.PluralRules> = {
  ar: new Intl.PluralRules("ar"),
  en: new Intl.PluralRules("en"),
};

// `.select(count)` returns which of the six categories the number falls into
// for that language. It does not produce any words — the dictionary supplies
// those; this only says which one to reach for.
export function pluralForm(count: number, locale: Locale): PluralForm {
  return RULES[locale].select(count);
}
