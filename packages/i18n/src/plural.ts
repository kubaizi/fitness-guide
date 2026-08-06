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
export type PluralForm = Intl.LDMLPluralRule;

const RULES: Record<Locale, Intl.PluralRules> = {
  ar: new Intl.PluralRules("ar"),
  en: new Intl.PluralRules("en"),
};

export function pluralForm(count: number, locale: Locale): PluralForm {
  return RULES[locale].select(count);
}
