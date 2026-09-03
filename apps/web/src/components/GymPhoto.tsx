// `next/image` is Next.js's replacement for <img>. It resizes images on the
// fly, serves modern formats (WebP/AVIF) to browsers that accept them, and
// lazy-loads anything below the fold — none of which a plain <img> does.
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
  // `string | undefined` rather than optional-with-`?`. Subtly different: this
  // says callers MUST pass the prop, even if the value they pass is undefined.
  // Since `gym.photos[0]` is undefined for a gym with no photos, making it
  // explicit stops anyone forgetting the empty case exists.
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
  // Composition rather than a conditional inside one big return: when there
  // is no photo, render a different component entirely.
  if (!src) {
    return <PhotoFrame seed={seed} label={alt} tall={tall} />;
  }

  return (
    <div className={`${styles.frame} ${tall ? styles.tall : ""}`}>
      <Image
        src={src}
        // `alt` is REQUIRED by next/image — the build fails without it. That
        // is deliberate: alt text is what a screen reader announces, and an
        // image with none is invisible to anyone not looking at the screen.
        alt={alt}
        // ── `fill` ──
        // A boolean prop written without a value; `fill` alone means
        // `fill={true}`. It tells the image to expand to fill its positioned
        // parent, which is why the wrapper div above exists and why the CSS
        // gives it `position: relative`.
        //
        // The alternative is passing explicit `width` and `height`. `fill` is
        // right here because the container's size is set by the layout, not
        // by the image.
        fill
        // ── `sizes` ──
        // Tells the browser how wide this image will actually be at each
        // breakpoint, so it can choose the right file BEFORE the CSS has been
        // applied. Look at the value passed in GymCard.tsx:
        //
        //   "(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 340px"
        //
        // i.e. full viewport width on a phone, half on a tablet, a fixed
        // 340px on a desktop. Getting this wrong is the usual reason a Next
        // app still ships oversized images despite using next/image.
        sizes={sizes}
        // Disables lazy loading and preloads the image. Correct for the one
        // large image at the top of a page — the hero — and wrong everywhere
        // else, since prioritising everything prioritises nothing.
        priority={priority}
        className={styles.img}
      />
    </div>
  );
}
