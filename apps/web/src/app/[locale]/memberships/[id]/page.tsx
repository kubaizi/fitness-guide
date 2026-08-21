import Link from "next/link";
import { notFound } from "next/navigation";
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
export default async function MembershipCardPage({
  params,
}: PageProps<"/[locale]/memberships/[id]">) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const user = await requireUser(locale);

  const membership = findMembershipForUser(id, user.id);
  if (!membership) notFound();

  const gym = findGymById(membership.gymId);
  const plan = findPlan(membership.planId);
  if (!gym || !plan) notFound();

  const t = createTranslator(locale);
  const isActive = membership.status.state === "active";

  const qrSvg = await QRCode.toString(membership.checkInToken, {
    type: "svg",
    margin: 0,
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
              dangerouslySetInnerHTML={{ __html: qrSvg }}
              role="img"
              aria-label={t("membership.scanAtGym")}
            />
            <p className={styles.token}>{membership.checkInToken}</p>
            <p className={styles.scanHint}>{t("membership.scanAtGym")}</p>
            <p className={styles.offlineHint}>{t("membership.cardHint")}</p>
          </>
        ) : (
          <div className={styles.expiredBox}>
            <p>{t("membership.expired")}</p>
            <Link href={`/${locale}/gyms/${gym.slug}`} className={styles.renew}>
              {t("membership.renew")}
            </Link>
          </div>
        )}

        <dl className={styles.details}>
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
