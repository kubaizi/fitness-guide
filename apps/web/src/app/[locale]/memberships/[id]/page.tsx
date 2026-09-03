import Link from "next/link";
import { notFound } from "next/navigation";
// A third-party npm package. Because this page is a Server Component, the
// library runs on the server and is never downloaded by the browser — the
// user receives only the finished SVG markup.
import QRCode from "qrcode";
import { createTranslator, formatDate, isLocale } from "@fg/i18n";
import { findMembershipForUser, findPlan, findGymById } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { Badge } from "@/components/Badge";
import { Price } from "@/components/Price";
import styles from "./page.module.css";

/**
 * C-32: the digital membership card.
 *
 * The QR is rendered to SVG on the server and inlined, so the card needs no
 * client JavaScript and no network request to display. That matters: the spec
 * requires this screen to work offline, because members scan it in basements
 * with no signal.
 *
 * It encodes the rotating checkInToken, never the membership id.
 */
// ── Why server-rendering the QR is the right call ──
// The client-side alternative would ship a QR library to every phone, run it
// after hydration, and fail entirely with no signal. Generating the SVG here
// means the code is in the first HTML response — it renders instantly, works
// offline, and costs the user nothing in JavaScript.
//
// This is the kind of decision Server Components exist to make possible.
export default async function MembershipCardPage({
  params,
}: PageProps<"/[locale]/memberships/[id]">) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const user = await requireUser(locale);

  // ── THE SECURITY-CRITICAL LINE ON THIS PAGE ──
  // Both `id` (from the URL) and `user.id` (from the verified session) are
  // passed. The query matches on both, so another member's URL simply finds
  // nothing and 404s — see `findMembershipForUser` in lib/db.ts.
  //
  // Written as `findMembership(id)` followed by a separate ownership check,
  // this would be an INSECURE DIRECT OBJECT REFERENCE: anyone could read any
  // member's entry token by editing the URL. Making userId a required
  // argument means the check cannot be left out.
  const membership = findMembershipForUser(id, user.id);
  if (!membership) notFound();

  const gym = findGymById(membership.gymId);
  const plan = findPlan(membership.planId);
  // Both checked in one condition — either being missing means the same
  // thing: dangling data, so there is no card to show.
  if (!gym || !plan) notFound();

  const t = createTranslator(locale);
  const isActive = membership.status.state === "active";

  // `await` in the middle of a component body. Perfectly ordinary in a Server
  // Component; impossible in a client one, which cannot be async.
  const qrSvg = await QRCode.toString(membership.checkInToken, {
    type: "svg",
    margin: 0,
    // "M" (medium) tolerates about 15% damage — enough for a scratched phone
    // screen, without inflating the code's size.
    errorCorrectionLevel: "M",
    color: { dark: "#0a0b0d", light: "#ffffff" },
  });

  return (
    <main className={styles.main}>
      <nav className={styles.crumb}>
        <Link href={`/${locale}/memberships`}>{t("membership.title")}</Link>
        <span aria-hidden="true">/</span>
        <span>{gym.name[locale]}</span>
      </nav>

      <article className={styles.card}>
        <header className={styles.head}>
          <div>
            <p className={styles.gymName}>{gym.name[locale]}</p>
            <p className={styles.planName}>{plan.name[locale]}</p>
          </div>
          <Badge tone={isActive ? "ok" : "neutral"}>
            {isActive ? t("membership.active") : t("membership.expired")}
          </Badge>
        </header>

        {isActive ? (
          <>
            {/* White plate behind the QR: scanners need the light quiet zone,
                and a dark-on-dark code simply will not read. */}
            <div
              className={styles.qrPlate}
              // ═══════════════════════════════════════════════════════════
              // `dangerouslySetInnerHTML` — React's deliberately ugly name
              // for injecting raw HTML.
              //
              // Normally React ESCAPES everything you render: put
              // `<script>alert(1)</script>` in a string and React prints it
              // as visible text rather than running it. That escaping is why
              // React apps are largely immune to XSS by default.
              //
              // This prop switches that protection OFF. The awkward name and
              // the required `{ __html: ... }` wrapper are intentional: they
              // make it impossible to use by accident, and easy to grep for
              // in a security review.
              //
              // ── Why it is acceptable HERE ──
              // `qrSvg` was produced by the qrcode library on this server,
              // from a token in our own database. No user input reaches it.
              //
              // ── When it would be a serious bug ──
              // Any string that originated with a user — a gym description, a
              // review, a name. That is a textbook XSS hole.
              //
              // Rule: only ever pass markup YOU generated, never anything a
              // user supplied.
              // ═══════════════════════════════════════════════════════════
              dangerouslySetInnerHTML={{ __html: qrSvg }}
              // The QR is meaningful, not decorative, so it is announced as
              // an image with a label rather than hidden.
              role="img"
              aria-label={t("membership.scanAtGym")}
            />
            {/* The token in plain text as well, so a member whose screen will
                not scan can read it out to the desk. */}
            <p className={styles.token}>{membership.checkInToken}</p>
            <p className={styles.scanHint}>{t("membership.scanAtGym")}</p>
            <p className={styles.offlineHint}>{t("membership.cardHint")}</p>
          </>
        ) : (
          // No QR for an inactive membership — showing one that the turnstile
          // will reject is worse than showing none. The renewal link makes it
          // a next step rather than a dead end.
          <div className={styles.expiredBox}>
            <p>{t("membership.expired")}</p>
            <Link href={`/${locale}/gyms/${gym.slug}`} className={styles.renew}>
              {t("membership.renew")}
            </Link>
          </div>
        )}

        <dl className={styles.details}>
          {/* The check is repeated rather than reusing `isActive` above,
              because TypeScript needs the comparison RIGHT HERE to narrow the
              union — `startsOn` and `endsOn` exist only on the active branch.
              A boolean computed earlier does not carry that narrowing with
              it. See packages/core/src/domain/membership.ts.

              The fragment `<>` is needed because a conditional must produce a
              single element, and there are two rows to render. */}
          {membership.status.state === "active" && (
            <>
              <div className={styles.row}>
                <dt>{t("membership.startsOn")}</dt>
                <dd>{formatDate(membership.status.startsOn, locale)}</dd>
              </div>
              <div className={styles.row}>
                <dt>{t("membership.expiresOn")}</dt>
                <dd>{formatDate(membership.status.endsOn, locale)}</dd>
              </div>
            </>
          )}
          <div className={styles.row}>
            <dt>{t("checkout.total")}</dt>
            <dd>
              <Price amount={membership.pricePaid} locale={locale} size="sm" />
            </dd>
          </div>
        </dl>
      </article>
    </main>
  );
}
