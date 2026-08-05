# Apps

Both apps are generated rather than hand-written — the official generators
produce better, more current output than anything copied from a template, and
they pick versions that actually work together.

Run these from the repo root.

## Web — Next.js

```bash
npm create next-app@latest apps/web -- --typescript --app --eslint --src-dir --use-npm
```

Then add the shared packages to `apps/web/package.json`:

```json
"dependencies": {
  "@fg/core": "*",
  "@fg/i18n": "*"
}
```

Run `npm install` from the root again to link them.

### Wiring direction and language

Put the locale in the route (`app/[locale]/layout.tsx`) so every page knows its
language and Next can render both statically:

```tsx
import { directionOf, isLocale, DEFAULT_LOCALE } from "@fg/i18n";

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const active = isLocale(locale) ? locale : DEFAULT_LOCALE;

  return (
    <html lang={active} dir={directionOf(active)}>
      <body>{children}</body>
    </html>
  );
}
```

Setting `dir` on `<html>` is what makes every CSS logical property mirror. That
one attribute is most of RTL support, provided you never write `left` or
`right` anywhere else.

## Mobile — Expo

```bash
npx create-expo-app@latest apps/mobile --template blank-typescript
```

React Native needs an explicit instruction to mirror, and **it only takes
effect after a restart** — so the language switch must reload the app:

```tsx
import { I18nManager } from "react-native";
import * as Updates from "expo-updates";
import { isRtl, type Locale } from "@fg/i18n";

export async function applyLocale(locale: Locale) {
  const shouldBeRtl = isRtl(locale);
  if (I18nManager.isRTL === shouldBeRtl) return;

  I18nManager.allowRTL(shouldBeRtl);
  I18nManager.forceRTL(shouldBeRtl);
  await Updates.reloadAsync(); // required — RN will not re-mirror live
}
```

Use `marginStart` / `marginEnd` and `start` / `end` in styles, never
`marginLeft` / `left`.

## The RTL lint rule already covers you

Discipline erodes as a codebase grows, so the build enforces this instead of
you remembering. `eslint.config.mjs` at the repo root already fails on
`marginLeft`, `paddingRight`, `left`, `right` and `textAlign: "left"` — and it
applies to `apps/**` the moment those directories exist. Nothing to add.

To see it fire:

```bash
npx eslint apps/mobile/App.tsx
```

Note it only catches these in **JavaScript and TypeScript** — object styles,
which is where React Native lives. ESLint cannot see inside `.css` files, so
for the web app use CSS logical properties (`margin-inline-start`,
`inset-inline-end`) and rely on review for those.
