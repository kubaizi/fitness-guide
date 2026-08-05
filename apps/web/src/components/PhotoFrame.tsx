import styles from "./PhotoFrame.module.css";

/**
 * Stands in for gym photography until real images exist.
 *
 * Deliberately a designed placeholder rather than a grey box: gym photos are
 * the product, and an empty rectangle would make the whole screen read as
 * unfinished when the layout around it is not.
 */
export function PhotoFrame({
  seed,
  label,
  tall = false,
}: {
  seed: string;
  label: string;
  tall?: boolean;
}) {
  // Stable pseudo-random hue offset so each gym looks distinct but consistent.
  const shift = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % 40;

  return (
    <div
      className={`${styles.frame} ${tall ? styles.tall : ""}`}
      style={{ ["--shift" as string]: `${shift}deg` }}
      role="img"
      aria-label={label}
    >
      <span className={styles.mark}>{label.trim().charAt(0)}</span>
    </div>
  );
}
