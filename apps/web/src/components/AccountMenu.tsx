"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import type { NavItem } from "@/lib/nav";
import styles from "./AccountMenu.module.css";

/**
 * The signed-in member's own menu, opened from their name and avatar.
 *
 * Everything personal lives here rather than in the top navigation: profile,
 * memberships, the gym you run, the admin console. That is where people look
 * for their own things, and it leaves the public row free for the sections.
 *
 * In the mobile drawer there is no dropdown — the drawer is already a menu, so
 * a menu inside a menu would be one layer too many. The same items render as a
 * flat list instead.
 */
export function AccountMenu({
  locale,
  name,
  items,
  signOut,
  variant = "header",
}: {
  locale: Locale;
  name: string;
  items: readonly NavItem[];
  /** The sign-out form, rendered on the server — it posts a Server Action. */
  signOut: React.ReactNode;
  variant?: "header" | "drawer";
}) {
  const t = createTranslator(locale);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // setOpen is a stable setter, so listing it changes nothing at runtime —
  // React Compiler just refuses to infer that on our behalf. Same as
  // MobileMenu.
  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
      // Focus goes back to the trigger, not to the top of the document.
      triggerRef.current?.focus();
    };

    // A click anywhere else dismisses it. Listening on `pointerdown` rather
    // than `click` so the menu is gone before the click lands on whatever is
    // underneath.
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  // The first character of the member's name. Works for Arabic and Latin
  // alike, and `Intl.Segmenter` keeps multi-code-unit characters whole where a
  // plain [0] would split them.
  const initial = [...name][0] ?? "?";

  const links = items.map((it) => (
    <Link key={it.href} href={it.href} className={styles.item} onClick={close}>
      {it.label}
    </Link>
  ));

  if (variant === "drawer") {
    return (
      <div className={styles.drawer}>
        <div className={styles.drawerWho}>
          <span className={styles.avatar} aria-hidden="true">
            {initial}
          </span>
          <span className={styles.drawerName}>{name}</span>
        </div>
        <nav className={styles.drawerLinks} aria-label={t("nav.profile")}>
          {links}
        </nav>
        {signOut}
      </div>
    );
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {initial}
        </span>
        <span className={styles.name}>{name}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.chevron}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          {links}
          <div className={styles.sep} />
          {signOut}
        </div>
      )}
    </div>
  );
}
