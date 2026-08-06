"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import { LocaleSwitch } from "./LocaleSwitch";
import styles from "./MobileMenu.module.css";

/**
 * The mobile navigation drawer.
 *
 * The desktop nav is hidden below 780px, so without this there is no way to
 * reach Explore or Memberships on a phone at all.
 *
 * `aria-modal="true"` is a promise that focus is contained, so this actually
 * traps Tab rather than just claiming to. It also closes on Escape, on
 * backdrop click, and on navigation, and restores focus to the trigger.
 */
export function MobileMenu({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    // Capture the trigger now: reading a ref inside cleanup can see a stale
    // node, and this one needs to receive focus back when the drawer closes.
    const trigger = triggerRef.current;

    // Freeze the page behind the drawer so it does not scroll under the overlay.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }

      if (e.key !== "Tab") return;

      // Keep Tab inside the panel while it claims to be modal.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Send focus back where it came from, not to the top of the document.
      trigger?.focus();
    };
  }, [open, close]);

  const links = [
    { href: `/${locale}`, label: t("nav.home") },
    { href: `/${locale}/explore`, label: t("nav.explore") },
    { href: `/${locale}/memberships`, label: t("nav.memberships") },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={t("nav.menu")}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      <div
        id="mobile-menu"
        ref={panelRef}
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.menu")}
        // Hidden from assistive tech and from Tab when closed, since the
        // panel stays in the DOM to keep the slide animation.
        inert={!open}
      >
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>{t("nav.menu")}</span>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label={t("common.close")}
            onClick={close}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className={styles.panelNav}>
          {links.map((link) => {
            const isCurrent = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={isCurrent ? styles.panelLinkCurrent : styles.panelLink}
                aria-current={isCurrent ? "page" : undefined}
                // Dismiss on tap rather than syncing to `pathname` in an
                // effect — that pattern causes a cascading re-render, and
                // React's lint rule is right to flag it.
                onClick={close}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Switching language is a full navigation, so the drawer unmounts
            and reopens closed — no explicit dismissal needed here. */}
        <div className={styles.panelFoot}>
          <LocaleSwitch current={locale} />
        </div>
      </div>
    </>
  );
}
