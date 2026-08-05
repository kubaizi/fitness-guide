import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@fg/i18n";

// The bare root has no language in the URL, so there is nothing to render
// here — only to decide where to send someone. A real deployment would read
// the Accept-Language header in `proxy.ts`; this is the honest fallback.
export default function RootRedirect() {
  redirect(`/${DEFAULT_LOCALE}`);
}
