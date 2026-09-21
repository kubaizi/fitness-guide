import type { JSX } from "react";

/** The networks a member can link from their profile. */
export type SocialNetwork = "instagram" | "x" | "snapchat" | "tiktok";

/**
 * Each network's mark, drawn by hand as a small SVG.
 *
 * Drawn rather than downloaded for the same reason as AvatarPlaceholder: no
 * icon package to install, nothing to fetch, and every mark is the same size
 * and stroke weight as its neighbours, which a mix of downloaded logos never
 * is. They are simplified — recognisable at 20px, not faithful at 200px.
 *
 * Each is a 24×24 drawing. Instagram and X are strokes; Snapchat and TikTok
 * are filled shapes, because that is how those two marks are known.
 */
const MARKS: Record<SocialNetwork, JSX.Element> = {
  instagram: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5v.01" />
    </g>
  ),
  x: (
    <path
      fill="currentColor"
      d="M17.7 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.3-8.3L1.7 3h6.4l4.4 5.9L17.7 3zm-1.1 16.2h1.7L7 4.7H5.2l11.4 14.5z"
    />
  ),
  snapchat: (
    <path
      fill="currentColor"
      d="M12 2.5c-3.4 0-5.6 2.5-5.6 5.8v2.3c-.6.2-1.3.1-1.8-.2-.4-.2-.8 0-.8.4 0 .6.9 1 1.8 1.3-.4 1.5-1.7 2.7-3.3 3.1-.4.1-.4.7 0 .9.8.3 1.6.4 2.1.5.2.5.2 1.2.7 1.3.6.1 1.4-.2 2.2 0 1 .3 1.9 1.6 4.7 1.6s3.7-1.3 4.7-1.6c.8-.2 1.6.1 2.2 0 .5-.1.5-.8.7-1.3.5-.1 1.3-.2 2.1-.5.4-.2.4-.8 0-.9-1.6-.4-2.9-1.6-3.3-3.1.9-.3 1.8-.7 1.8-1.3 0-.4-.4-.6-.8-.4-.5.3-1.2.4-1.8.2V8.3c0-3.3-2.2-5.8-5.6-5.8z"
    />
  ),
  tiktok: (
    <path
      fill="currentColor"
      d="M16.6 2c.3 2.4 1.8 4 4.2 4.2v3.3c-1.6 0-3-.5-4.2-1.3v6.5c0 3.3-2.7 6-6 6s-6-2.7-6-6 2.7-6 6-6c.3 0 .6 0 .9.1v3.4c-.3-.1-.6-.2-.9-.2-1.5 0-2.7 1.2-2.7 2.7s1.2 2.7 2.7 2.7 2.7-1.2 2.7-2.7V2h3.3z"
    />
  ),
};

/**
 * One network's mark. Decorative: it always sits next to the network's name
 * in text, so a screen reader has nothing to gain from hearing it twice.
 */
export function SocialIcon({
  network,
  className,
}: {
  network: SocialNetwork;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} data-network={network}>
      {MARKS[network]}
    </svg>
  );
}
