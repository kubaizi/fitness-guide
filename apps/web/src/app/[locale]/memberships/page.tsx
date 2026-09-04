import Link from "next/link";
import { notFound } from "next/navigation";
import type { Locale } from "@fg/i18n";
import { createTranslator, formatDate, isLocale } from "@fg/i18n";
import { membershipsWithDetailsForUser } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { describeStatus, endDateOf } from "@/lib/membership";
import { Badge } from "@/components/Badge";
import { Price } from "@/components/Price";
import styles from "./page.module.css";

// C-31: the member's own memberships.
//
// The first page in this walkthrough that REQUIRES a signed-in user — note
// `requireUser` below rather than `getCurrentUser`.
export default async function MembershipsPage({
  params,
}: PageProps<"/[locale]/memberships">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  // An explicit `: Locale` annotation here, where other pages rely on
  // inference. Equivalent — just a stylistic difference between files.
  const locale: Locale = raw;
  const t = createTranslator(locale);

  // Redirects to login when signed out. The data layer checks again anyway.
  //
  // `requireUser` either returns a user or never returns at all — see
  // lib/dal.ts. So `user` below is guaranteed non-null with no check, and
  // there is no "not signed in" branch to forget.
  const user = await requireUser(locale);
  // Scoped by `user.id`, so this can only ever return the signed-in member's
  // own memberships. Authorisation enforced by the query's shape rather than
  // by a filter someone could omit.
  const items = await membershipsWithDetailsForUser(user.id);

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{t("membership.title")}</h1>

      {items.length === 0 ? (
        // An empty state with a way OUT of it. "You have no memberships" is a
        // dead end; the same message plus a browse button is a next step.
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{t("membership.none")}</p>
          <p className={styles.emptyHint}>{t("membership.noneHint")}</p>
          <Link href={`/${locale}/gyms`} className={styles.browse}>
            {t("membership.browseGyms")}
          </Link>
        </div>
      ) : (
        <ul className={styles.list}>
          {/* ── DESTRUCTURING WITH RENAMING inside the map parameter ──
              `({ membership: m, gymName, planName })` unpacks each item and
              renames `membership` to the shorter `m`, which is then used
              throughout the block. Equivalent to:
                (item) => { const m = item.membership; ... } */}
          {items.map(({ membership: m, gymName, planName }) => {
            // The presentation rules live in lib/membership.ts, shared with
            // the gym roster and the admin table — see that file on why a
            // second copy of this switch would be a liability.
            const { key, tone } = describeStatus(m.status);
            const endsOn = endDateOf(m.status);
            const isActive = m.status.state === "active";

            return (
              <li key={m.id}>
                <Link href={`/${locale}/memberships/${m.id}`} className={styles.row}>
                  <div className={styles.rowMain}>
                    <div className={styles.rowTop}>
                      <span className={styles.gymName}>{gymName[locale]}</span>
                      {/* Both the colour and the wording come from
                          describeStatus, so they cannot disagree. */}
                      <Badge tone={tone}>{t(key)}</Badge>
                    </div>
                    <span className={styles.planName}>
                      {planName[locale]} ·{" "}
                      <Price amount={m.pricePaid} locale={locale} size="sm" />
                    </span>
                    {/* `endsOn` is null for states that have no end date —
                        cancelled, for instance. See endDateOf in
                        lib/membership.ts for why cancelled deliberately
                        returns null rather than the cancellation date. */}
                    {endsOn && (
                      <span className={styles.dates}>
                        {t("membership.expiresOn")} {formatDate(endsOn, locale)}
                      </span>
                    )}
                  </div>

                  {/* The QR prompt only on memberships you can actually use
                      today. Showing it on an expired one would promise entry
                      that the turnstile will refuse. */}
                  {isActive && (
                    <span className={styles.cta}>{t("membership.showQr")}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
