import type { Locale } from "@fg/i18n";
import { createTranslator } from "@fg/i18n";
import styles from "./HomeSearch.module.css";

/**
 * The search bar at the top of the home page.
 *
 * A plain GET form, not a client component: submitting navigates to
 * /explore?q=..., where the existing browser takes over. That means it works
 * with JavaScript disabled, the result is a real URL the member can share or
 * bookmark, and this component ships no JavaScript at all.
 */
export function HomeSearch({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);

  return (
    <form
      action={`/${locale}/explore`}
      method="get"
      className={styles.form}
      role="search"
    >
      <input
        type="search"
        name="q"
        className={styles.input}
        placeholder={t("home.searchPlaceholder")}
        aria-label={t("home.searchPlaceholder")}
      />
      <button type="submit" className={styles.button}>
        {t("home.searchAction")}
      </button>
    </form>
  );
}
