import Link from "next/link";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import type { GymDetail } from "@/lib/db";
import { Badge } from "./Badge";
import { GymPhoto } from "./GymPhoto";
import { Price } from "./Price";
import styles from "./GymCard.module.css";

/**
 * The gym tile used in every grid — the home page and explore.
 *
 * A good example of COMPOSITION: this component holds almost no logic of its
 * own. It arranges three smaller components (GymPhoto, Badge, Price),
 * each of which owns one decision. Building screens out of small pieces like
 * this is the core React idea.
 *
 * No `"use client"` at the top, so this is a SERVER COMPONENT: it runs on the
 * server, and the browser receives finished HTML. None of this code is
 * downloaded by the user.
 */

// A lookup table mapping the gym's access value to its translation key.
//
// `as const` freezes it so the values are the exact strings "access.men" etc.
// rather than the general type `string` — which is what lets them be passed
// to `t()`, whose parameter is the union of valid keys.
//
// Preferred over a switch here because it is pure data: four keys, one line
// each, and adding a fifth is a one-line change.
const ACCESS_KEY = {
  men: "access.men",
  women: "access.women",
  mixed: "access.mixed",
  separate_sections: "access.separateSections",
} as const;

// ── Reading the parameter list ──
// `{ gym, locale }` DESTRUCTURES the props. React always passes components a
// single object; this pulls the two fields out into local variables. Written
// longhand it would be:
//
//   export function GymCard(props: { gym: GymDetail; locale: Locale }) {
//     const gym = props.gym;
//     const locale = props.locale;
//
// The `: { gym: GymDetail; locale: Locale }` after the braces is the
// TypeScript annotation for that object — the component's contract.
export function GymCard({ gym, locale }: { gym: GymDetail; locale: Locale }) {
  const t = createTranslator(locale);
  // Computed once, used twice below. Reading `.state` is how you inspect a
  // discriminated union — see packages/core/src/domain/gym.ts.
  const verified = gym.verification.state === "verified";

  return (
    // The whole card is one link, so the entire tile is clickable rather than
    // just the title. `<Link>` is Next's client-side navigation — see the
    // note in app/[locale]/page.tsx.
    <Link href={`/${locale}/gyms/${gym.slug}`} className={styles.card}>
      <GymPhoto
        // `gym.photos[0]` is `undefined` when the array is empty. GymPhoto
        // expects exactly that and renders a placeholder — see its `src` prop.
        src={gym.photos[0]}
        // `gym.name` is a `Localized` object, not a string, so it is indexed
        // by locale: `gym.name["ar"]`. You will see this pattern on every
        // piece of gym text in the app.
        alt={gym.name[locale]}
        seed={gym.id}
        sizes="(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 340px"
      />

      {/* Emad asked for the price ON the photo, and for the rating to live on
          the gym's own page rather than in the list. The overlay sits over the
          image, so it needs its own contrast rather than the card's. */}
      {gym.startingPrice !== null && (
        <span className={styles.priceOnPhoto}>
          <span className={styles.fromLabel}>{t("gym.startingFrom")}</span>
          <Price amount={gym.startingPrice} locale={locale} size="sm" />
        </span>
      )}

      <div className={styles.body}>
        <div className={styles.top}>
          <h3 className={styles.name}>{gym.name[locale]}</h3>
          {/* Two ternaries driven by the same boolean: one picks the colour,
              the other the wording. */}
          <Badge tone={verified ? "ok" : "warn"}>
            {verified ? t("gym.verified") : t("gym.pendingReview")}
          </Badge>
        </div>

        <p className={styles.meta}>
          {/* The `·` is a literal character in the JSX — text between
              expressions is rendered as-is.

              `ACCESS_KEY[gym.access]` looks the key up in the table above,
              then `t()` translates it. */}
          {gym.area[locale]} · {t(ACCESS_KEY[gym.access])}
        </p>
      </div>
    </Link>
  );
}
