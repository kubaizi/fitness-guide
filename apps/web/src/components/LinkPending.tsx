"use client";

import { useLinkStatus } from "next/link";
import styles from "./LinkPending.module.css";

/**
 * A small spinner that appears on a link while the page it points at loads.
 *
 * ## How it knows
 *
 * `useLinkStatus` is a hook from Next that only works INSIDE a `<Link>`. It
 * reports `pending: true` from the moment the link is tapped until the new
 * page has arrived. Put this component inside a Link and the Link gains a
 * loading state; put it anywhere else and it does nothing.
 *
 * ## Why it waits before showing
 *
 * Most navigations finish in well under a second, and a spinner that flashes
 * for 80ms is worse than none — it reads as a glitch. The CSS gives it a delay
 * before it fades in, so it only appears on a navigation slow enough to need
 * it. The account page, with its five queries and its photos, is exactly that.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  // `aria-hidden` because the spinner is decoration: the loading page itself
  // announces the loading state to a screen reader.
  return <span aria-hidden="true" className={pending ? styles.on : styles.off} />;
}
