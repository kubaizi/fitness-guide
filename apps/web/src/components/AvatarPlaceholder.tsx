/**
 * The stand-in shown when a member has no profile picture.
 *
 * ## Why a drawing and not the first letter of their name
 *
 * It used to be the initial, which identifies the person better than any
 * generic figure can. The trade is deliberate: a letter in a circle looks
 * finished, so nobody wonders what it is for, while a silhouette reads as an
 * empty slot and quietly invites the member to fill it.
 *
 * ## Why it takes its colours from the class
 *
 * Both paths are `currentColor`, and there is no background in the SVG at all.
 * The caller's class supplies the circle, the ring and the colour — which is
 * how the same drawing serves a 28px header avatar and an 84px one on the
 * profile page without knowing either size exists.
 *
 * Drawn to sit inside a circle. At its widest the figure spans x 11 to 37, and
 * at that height a 48-unit circle is 7 to 41 across, so nothing touches the
 * edge and the shape needs no clipping to look right.
 */
export function AvatarPlaceholder({ className }: { className?: string }) {
  return (
    // `aria-hidden` because it carries no information. The member's name is
    // always beside it in real text, and a screen reader announcing a generic
    // figure would add noise rather than meaning.
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <circle cx="24" cy="18" r="7" fill="currentColor" />
      <path
        d="M24 27.5c-7.2 0-13 4.7-13 10.5V41h26v-3c0-5.8-5.8-10.5-13-10.5z"
        fill="currentColor"
      />
    </svg>
  );
}
