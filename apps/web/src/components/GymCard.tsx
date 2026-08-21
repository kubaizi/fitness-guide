import Link from "next/link";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import type { GymDetail } from "@/lib/db";
import { Badge } from "./Badge";
import { GymPhoto } from "./GymPhoto";
import { Price } from "./Price";
import { Rating } from "./Rating";
import styles from "./GymCard.module.css";

const ACCESS_KEY = {
  men: "access.men",
  women: "access.women",
  mixed: "access.mixed",
  separate_sections: "access.separateSections",
} as const;

export function GymCard({ gym, locale }: { gym: GymDetail; locale: Locale }) {
  const t = createTranslator(locale);
  const verified = gym.verification.state === "verified";

  return (
    <Link href={`/${locale}/gyms/${gym.slug}`} className={styles.card}>
      <GymPhoto
        src={gym.photos[0]}
        alt={gym.name[locale]}
        seed={gym.id}
        sizes="(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 340px"
      />

      <div className={styles.body}>
        <div className={styles.top}>
          <h3 className={styles.name}>{gym.name[locale]}</h3>
          <Badge tone={verified ? "ok" : "warn"}>
            {verified ? t("gym.verified") : t("gym.pendingReview")}
          </Badge>
        </div>

        <p className={styles.meta}>
          {gym.area[locale]} · {t(ACCESS_KEY[gym.access])}
        </p>

        <div className={styles.foot}>
          <Rating rating={gym.rating} count={gym.reviewCount} locale={locale} />
          {gym.startingPrice !== null && (
            <span className={styles.price}>
              <span className={styles.fromLabel}>{t("gym.startingFrom")}</span>
              <Price amount={gym.startingPrice} locale={locale} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
