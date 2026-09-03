// ═══════════════════════════════════════════════════════════════════════════
// `"use client"` — THE OTHER HALF OF THE MODEL.
//
// This directive marks the file as a CLIENT COMPONENT. It is the opposite of
// the "use server" you saw in src/app/actions/. What it buys you:
//
//   ✅ useState, useEffect, useRef and every other hook
//   ✅ onClick, onChange and other event handlers
//   ✅ access to `document`, `window`, and the DOM
//
// What it costs:
//
//   ❌ this code is DOWNLOADED and run by the browser (bundle size)
//   ❌ it cannot be `async`, and cannot read the database or the session
//
// A client component still renders once on the SERVER first, to produce the
// initial HTML. React then "hydrates" it in the browser — attaching the event
// handlers to that existing markup. So the body runs in both places, which is
// why anything that differs between the two (random numbers, `Date.now()`,
// `window`) causes a hydration mismatch. See the `mounted` trick below.
//
// Rule of thumb used throughout this codebase: keep "use client" as far DOWN
// the tree as possible. SiteHeader stays a server component and only this
// drawer opts in, so the rest of the header costs the user nothing.
// ═══════════════════════════════════════════════════════════════════════════
"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import type { NavItem } from "@/lib/nav";
import { LocaleSwitch } from "./LocaleSwitch";
import styles from "./MobileMenu.module.css";

/** Never fires — `mounted` only needs to differ between server and client. */
// A function returning a function. `useSyncExternalStore` demands a subscribe
// argument that returns an unsubscribe callback; this satisfies the signature
// while doing nothing at all, because there is no store to watch.
const subscribeNoop = () => () => {};

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
export function MobileMenu({
  locale,
  items,
  auth,
}: {
  locale: Locale;
  items: readonly NavItem[];
  /**
   * The sign in / sign out control, passed in as rendered output.
   *
   * It is a server component and this is a client one, so it arrives as a
   * slot rather than an import. Without it the drawer had no auth control at
   * all — and since the header's own control is hidden below 780px, there was
   * no way to sign in or out on a phone.
   */
  auth: React.ReactNode;
}) {
  const t = createTranslator(locale);
  // A Next.js hook giving the current URL path, e.g. "/ar/gyms". Used
  // below to mark the active link. Hooks may only be called in client
  // components — this line alone would break in a server component.
  const pathname = usePathname();

  // ── `useState` — the fundamental React hook ──
  //
  //   const [value, setValue] = useState(initialValue);
  //
  // It returns a pair, destructured from an array: the current value, and a
  // function to change it. Calling the setter tells React to re-run this
  // component and redraw with the new value.
  //
  // The critical rule: NEVER assign directly (`open = true`). React would not
  // know anything changed and nothing would re-render. Always go through the
  // setter.
  const [open, setOpen] = useState(false);

  // ── `useRef` — a box that survives re-renders WITHOUT causing one ──
  //
  // Two uses in React, and this file shows the first:
  //
  //   1. Holding a DOM node. Attach with `ref={triggerRef}` on an element,
  //      and afterwards `triggerRef.current` is that real DOM node, so you
  //      can call `.focus()` on it.
  //   2. Storing a mutable value you do not want to trigger a re-render.
  //
  // `.current` starts as null, because the element does not exist until React
  // has rendered it. Hence the `?.` at every use site.
  //
  // useState vs useRef in one line: changing state redraws the screen;
  // changing a ref does not.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // ── `useCallback` — keeps the same function identity between renders ──
  // Every render would otherwise create a brand-new `close` function. Since
  // `close` is listed in the effect's dependency array below, a new one each
  // time would make the effect tear down and re-run on every render.
  //
  // setOpen is a stable setter, so listing it changes nothing at runtime —
  // React Compiler just refuses to infer that on our behalf.
  const close = useCallback(() => setOpen(false), [setOpen]);

  /**
   * The drawer has to be portalled OUT of the header.
   *
   * SiteHeader sets `backdrop-filter: blur(8px)`, and backdrop-filter (like
   * transform, filter and perspective) makes an element a CONTAINING BLOCK for
   * its `position: fixed` descendants. Rendered in place, the drawer was
   * therefore fixed to the 64px-tall header rather than to the viewport —
   * `inset-block: 0` resolved to the header's box, not the screen. The header
   * also opens a stacking context, so the panel's z-index:50 was trapped
   * beneath later page content no matter how high it went.
   *
   * Portalling to <body> puts it back in the viewport's containing block.
   */
  // ── `useSyncExternalStore` used as an "am I in the browser yet?" flag ──
  //
  // Its three arguments are: subscribe, getSnapshot (client), and
  // getServerSnapshot. React calls the third on the server and the second in
  // the browser — so this returns `false` during server rendering and `true`
  // once hydrated.
  //
  // Why not `useState(false)` plus a `useEffect` that sets it true? That
  // works, but this is the sanctioned pattern: it tells React explicitly that
  // the two environments differ, so no hydration mismatch is reported.
  //
  // The flag is needed because `createPortal(drawer, document.body)` requires
  // `document`, which does not exist on the server.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true, // in the browser
    () => false, // on the server
  );

  // ── `useEffect` — run code AFTER render, for things outside React ──
  //
  //   useEffect(() => { ...setup...; return () => { ...cleanup... } }, [deps])
  //
  // The DEPENDENCY ARRAY at the end controls when it re-runs: after any
  // render where one of those values changed. `[]` would mean "only once".
  //
  // The returned function is the CLEANUP. React runs it before the effect
  // runs again, and when the component unmounts. Everything the effect
  // attaches to the outside world must be undone there — otherwise listeners
  // pile up on every open, which is the classic memory leak in React.
  //
  // Effects are for ESCAPING React: event listeners on `document`, focus
  // management, body styles. Do not use one to compute a value from props;
  // just compute it during render.
  useEffect(() => {
    // Nothing to set up while closed — bail out early.
    if (!open) return;

    // Capture the trigger now: reading a ref inside cleanup can see a stale
    // node, and this one needs to receive focus back when the drawer closes.
    const trigger = triggerRef.current;

    // Freeze the page behind the drawer so it does not scroll under the overlay.
    // The previous value is saved so cleanup can restore it rather than
    // assuming it was empty.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move keyboard focus into the drawer as it opens, so a keyboard or
    // screen-reader user is not left behind on the page underneath.
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }

      if (e.key !== "Tab") return;

      // Keep Tab inside the panel while it claims to be modal.
      //
      // This is a FOCUS TRAP. `aria-modal="true"` promises assistive
      // technology that focus is contained; implementing that promise is what
      // the rest of this handler does. Claiming it without doing it is worse
      // than not claiming it.
      //
      // The selector finds everything focusable inside the panel.
      // `querySelectorAll<HTMLElement>` uses a generic to say what element
      // type comes back, since the DOM API cannot know.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      // Tabbing backwards off the first element wraps to the last, and
      // forwards off the last wraps to the first. `preventDefault()` stops
      // the browser's own move so ours takes effect instead.
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // THE CLEANUP. Every line here undoes a line above, in reverse.
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Send focus back where it came from, not to the top of the document.
      trigger?.focus();
    };
  }, [open, close]);

  // Items come from the server, so the drawer shows exactly what the header
  // shows — including hiding links the visitor is not signed in for.
  //
  // Assigning JSX to a variable is ordinary: elements are just values, so
  // they can be stored, passed around and returned like anything else. It is
  // done here because `drawer` is handed to createPortal at the bottom rather
  // than returned directly.
  const drawer = (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ""}`}
        onClick={close}
        // Decorative dimming layer — the real controls are in the panel, so
        // there is nothing here for a screen reader to announce.
        aria-hidden="true"
      />

      <div
        id="mobile-menu"
        ref={panelRef}
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
        // `role`, `aria-modal` and `aria-label` together tell assistive
        // technology this is a modal dialogue and what it is called.
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.menu")}
        // Hidden from assistive tech and from Tab when closed, since the
        // panel stays in the DOM to keep the slide animation.
        //
        // `inert` is a relatively new HTML attribute meaning "this subtree
        // cannot be focused or clicked". It is what makes leaving the closed
        // panel mounted safe: it is invisible AND unreachable, rather than
        // merely off-screen but still tabbable.
        inert={!open}
      >
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>{t("nav.menu")}</span>
          <button
            ref={closeRef}
            // `type="button"` is important on every button not meant to
            // submit: the HTML default is `type="submit"`, so inside a form
            // an unmarked button silently submits it.
            type="button"
            className={styles.close}
            // The button's content is an icon, so its accessible name has to
            // come from aria-label — otherwise it announces as just "button".
            aria-label={t("common.close")}
            onClick={close}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className={styles.panelNav}>
          {/* A `.map` with a function BODY rather than a bare expression,
              because a local variable is computed first. Note the explicit
              `return` that a braced body requires. */}
          {items.map((link) => {
            const isCurrent = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={isCurrent ? styles.panelLinkCurrent : styles.panelLink}
                // `undefined` rather than `false`: passing undefined omits the
                // attribute entirely, while `aria-current="false"` would be a
                // present attribute that some screen readers still announce.
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

        <div className={styles.panelFoot}>
          {/*
            The sign-in links navigate within the same locale, so the layout
            is not rebuilt and this drawer survives the navigation — it would
            sit open on top of the login page, with body scroll still locked.
            The nav links above dismiss themselves with their own onClick, but
            `auth` is rendered on the server and cannot carry one, so the click
            is caught here as it bubbles out.

            Not an interactive element itself: it only listens for clicks from
            the real controls inside it, which keyboard users reach normally.
          */}
          {/* EVENT BUBBLING: a click on a child travels up through its
              ancestors, so this wrapper sees clicks on the links inside
              `auth` even though it did not render them itself. */}
          <div onClick={close}>{auth}</div>

          {/* Switching language rebuilds the [locale] layout, so the drawer
              unmounts and comes back closed — verified, no handler needed. */}
          <LocaleSwitch current={locale} />
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={t("nav.menu")}
        // These two wire the trigger to the panel for assistive technology:
        // whether it is currently open, and which element it controls
        // (matching the `id="mobile-menu"` above).
        aria-expanded={open}
        aria-controls="mobile-menu"
        // An INLINE arrow function as the handler. Fine for a one-liner;
        // anything reused or listed in a dependency array wants useCallback
        // instead, as `close` does.
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* ── `createPortal(what, where)` ──
          Renders `drawer` into `document.body` instead of here in the tree.
          The component still OWNS it — state and events work normally, and
          clicks still bubble up through the React tree — but in the actual
          DOM it is a child of <body>, escaping the header's containing block
          and stacking context. See the long comment above `mounted`.

          Portals need a real DOM node, so this waits for hydration. The drawer
          is closed on first paint anyway, so nothing visible is deferred. */}
      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
