import Image from "next/image";
import { PhotoFrame } from "./PhotoFrame";
import styles from "./GymPhoto.module.css";

/**
 * A gym photo, or an honest placeholder when there isn't one.
 *
 * A newly onboarded gym genuinely has no images until it uploads them, so the
 * empty case is a real state rather than a loading artefact — hence the
 * fallback to PhotoFrame rather than a broken image or a blank box.
 *
 * `fill` + `sizes` lets next/image serve an appropriately sized file per
 * breakpoint instead of pushing a 1600px original to a phone.
 */
export function GymPhoto({
  src,
  alt,
  seed,
  sizes,
  priority = false,
  tall = false,
}: {
  src: string | undefined;
  alt: string;
  seed: string;
  sizes: string;
  priority?: boolean;
  tall?: boolean;
}) {
  if (!src) {
    return <PhotoFrame seed={seed} label={alt} tall={tall} />;
  }

  return (
    <div className={`${styles.frame} ${tall ? styles.tall : ""}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={styles.img}
      />
    </div>
  );
}
