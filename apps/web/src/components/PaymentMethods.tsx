// Interactive: it tracks which method is selected, so it needs state and
// therefore the client. See MobileMenu.tsx for what "use client" means.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import styles from "./PaymentMethods.module.css";

type Method = "knet" | "card";

/**
 * Payment method selection.
 *
 * There is no gateway wired up yet — the KNET merchant account depends on a
 * licensed entity that does not exist. So "Pay now" navigates to the
 * confirmation screen without charging anything, and the checkout page says
 * so plainly. When MyFatoorah or Tap is connected, only this component's
 * submit handler changes.
 */
export function PaymentMethods({ locale, planId }: { locale: Locale; planId: string }) {
  const t = createTranslator(locale);
  // `useRouter` gives programmatic navigation — going somewhere from code
  // rather than from the user clicking a <Link>. A client-only hook.
  const router = useRouter();

  // `useState<Method>("knet")` — the generic pins the state's type, so
  // `setMethod("kent")` is a compile error. Without it TypeScript would infer
  // the wider `string` from the initial value.
  //
  // KNET is pre-selected because it is what most Kuwaiti customers use;
  // defaulting to nothing selected would just add a step for the majority.
  const [method, setMethod] = useState<Method>("knet");
  // A second, independent piece of state. Prefer several small useState calls
  // over one big state object — each concern updates on its own.
  const [submitting, setSubmitting] = useState(false);

  const pay = () => {
    // Set BEFORE navigating, so the button disables immediately and a second
    // tap cannot fire a second payment. With a real gateway this guard
    // against double submission matters a great deal.
    setSubmitting(true);
    // `router.push` navigates without a full page reload, adding an entry to
    // the browser's history so Back works. `router.replace` would navigate
    // without the history entry — which is what you would want after a real
    // payment, so Back cannot return to the pay screen.
    router.push(`/${locale}/checkout/${planId}/confirmed`);
  };

  return (
    <div className={styles.wrap}>
      {/* ── Buttons with radio semantics ──
          These are styled <button>s, not <input type="radio">, because the
          design needs a card-shaped target that a real radio cannot easily
          be. The ARIA attributes restore the meaning that was given up:

            role="radiogroup" + aria-label  the container is one named choice
            role="radio"                    each button is an option
            aria-checked                    which one is currently chosen

          Without these a screen reader would announce two unrelated buttons
          and never convey that they are alternatives. If you reach for a
          custom control instead of the native element, this is the debt you
          take on. */}
      <div
        className={styles.options}
        role="radiogroup"
        aria-label={t("checkout.paymentMethod")}
      >
        <button
          type="button"
          role="radio"
          aria-checked={method === "knet"}
          className={method === "knet" ? styles.optionActive : styles.option}
          // The whole state pattern in one line: click → setter → re-render
          // with the new value → the className ternary above resolves
          // differently → the highlight moves.
          onClick={() => setMethod("knet")}
        >
          <span className={styles.mark}>KNET</span>
          {t("checkout.payWithKnet")}
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={method === "card"}
          className={method === "card" ? styles.optionActive : styles.option}
          onClick={() => setMethod("card")}
        >
          <span className={styles.mark}>VISA</span>
          {t("checkout.payWithCard")}
        </button>
      </div>

      {/* `disabled={submitting}` and the label both read the same flag, so
          the button cannot appear busy while still being clickable. */}
      <button type="button" className={styles.pay} onClick={pay} disabled={submitting}>
        {submitting ? t("common.loading") : t("checkout.payNow")}
      </button>
    </div>
  );
}
