import { notFound, redirect } from "next/navigation";
import { isLocale } from "@fg/i18n";
import { getCurrentUser } from "@/lib/dal";
import { landingFor } from "@/lib/roles";
import { LoginForm } from "@/components/LoginForm";
import styles from "@/components/AuthForm.module.css";

/**
 * G-01 — the gym door.
 *
 * Separate from the member door on purpose: a gym signing in is doing a
 * different job from a member signing in, and one form describing both ends up
 * describing neither. Admin comes through here too — it is a back-office
 * account, not a customer one.
 */
// Line for line, this is ../../login/page.tsx with `door="partner"` instead of
// `door="member"`. The duplication is deliberate and cheap: two URLs must
// exist, and each needs its own page file, but all the real behaviour lives
// in the one shared LoginForm.
//
// Its URL comes from the folder nesting: app/[locale]/partner/login/page.tsx
// serves /ar/partner/login. The `partner` folder is a plain segment — no
// layout.tsx in it, so it adds a path level and nothing else.
export default async function PartnerLoginPage({
  params,
}: PageProps<"/[locale]/partner/login">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  // Same guard as the member door. Note it sends a signed-in MEMBER who lands
  // here to their own memberships page rather than refusing them — being at
  // the wrong door is a wrong turn, not an error.
  const user = await getCurrentUser();
  if (user) redirect(landingFor(user, locale));

  return (
    <main className={styles.main}>
      <LoginForm locale={locale} door="partner" />
    </main>
  );
}
