import Link from "next/link";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import type { GymDetail } from "@/lib/gyms";
import { Badge } from "./Badge";
import { PhotoFrame } from "./PhotoFrame";
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
    <Link href={`/${locale}/gyms/${gym.id}`} className={styles.card}>
      <PhotoFrame seed={gym.id} label={gym.name[locale]} />

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
