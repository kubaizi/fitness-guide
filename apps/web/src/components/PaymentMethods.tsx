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
  const router = useRouter();

  const [method, setMethod] = useState<Method>("knet");
  const [submitting, setSubmitting] = useState(false);

  const pay = () => {
    setSubmitting(true);
    router.push(`/${locale}/checkout/${planId}/confirmed`);
  };

  return (
    <div className={styles.wrap}>
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

      <button type="button" className={styles.pay} onClick={pay} disabled={submitting}>
        {submitting ? t("common.loading") : t("checkout.payNow")}
      </button>
    </div>
  );
}
