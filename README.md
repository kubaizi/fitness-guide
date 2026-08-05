# Fitness Guide

A fitness marketplace for Kuwait. Release one covers **gyms only**: discovery,
membership purchase, QR check-in, and the dashboards gyms and admins need to
operate it.

Arabic is the default language. English is a full peer, not an afterthought.

---

## Getting started

```bash
npm install
npm test
```

That should give you 34 passing tests. If it does, your toolchain works.

Other commands, all run from the repo root:

```bash
npm run typecheck     # compile-time check, no output emitted
npm run test          # all workspaces
npm run lint          # ESLint, including the RTL and money rules
npm run build         # all workspaces
npm run format        # Prettier, writes in place
npm run format:check  # Prettier, reports without writing
```

The first four are Turborepo tasks that fan out across the workspaces and cache
results, so re-running an unchanged package is instant.

## VS Code

Open the repo root — not a subfolder, or the workspace links break. VS Code
will offer to install the recommended extensions; accept, since ESLint and
Prettier do nothing without them.

Two settings in `.vscode/settings.json` are load-bearing rather than taste:

- **`typescript.tsdk`** points at the repo's TypeScript, so the editor and
  `npm run typecheck` never disagree about whether your code compiles.
- **`importModuleSpecifierEnding: "minimal"`** makes auto-import write
  `./money` rather than `./money.js`. Extensionless is the correct convention
  under `moduleResolution: Bundler` — and it is a hard requirement once
  Next.js is in the picture: Turbopack resolves workspace packages from their
  TypeScript source, and unlike `tsc` it does not map a `.js` specifier onto a
  `.ts` file. A `.js` extension here fails to resolve in `next dev`.

Press **F5** on any `.test.ts` to debug it with breakpoints.

---

## Layout

```
fitness-guide/
├── apps/
│   ├── web/            Next.js — public site, gym dashboard, admin console
│   └── mobile/         Expo — the customer app
└── packages/
    ├── core/           Money, domain types, Result — no UI, no framework
    └── i18n/           Locales, translation, direction, formatting
```

If you are coming from .NET, this is your solution file. `packages/*` are class
libraries, `apps/*` are the executables, and `npm install` at the root wires the
project references for you. Import across packages with `@fg/core` and
`@fg/i18n` exactly as you would add a project reference.

---

## The two rules that are expensive to add later

### 1. Money is always an integer count of fils

JavaScript has no `decimal`. Every number is a float, so `0.1 + 0.2` is not
`0.3`. Kuwait sharpens this: **KWD has three decimal places**, so 1 dinar is
1000 fils and "12.500 KWD" is `12500`.

```ts
import { parseKwd, splitCommission, formatKwd } from "@fg/core";

const price = parseKwd("12.500"); // 12500 — never a float
const { platform, gym } = splitCommission(price, 1500); // 15% in basis points
formatKwd(gym, "ar"); // "‏10.625 د.ك."
```

Prices are only ever turned into a decimal string at the moment of display.
Never in storage, never in an API payload, never in a calculation.

`splitCommission` and `allocate` are written so the parts always sum back to
the original amount — no stray fils appears or vanishes. There are tests
proving this across a thousand rates, because a payout that will not reconcile
is a genuinely awful bug to find six months in.

### 2. Never write `left` or `right`

Arabic mirrors the entire interface. Use logical properties and both languages
work for free:

```css
margin-left: 16px; /* ✗ stays left in Arabic — layout breaks */
margin-inline-start: 16px; /* ✓ mirrors automatically */
```

React Native uses `marginStart` / `marginEnd` for the same reason. The
`mirror()` helper in `@fg/i18n` exists only for the rare case where a physical
direction is genuinely unavoidable, such as a chevron that must point forward.

---

## Translations

Arabic is the source of truth. Add a key to `packages/i18n/src/locales/ar.ts`
first; TypeScript then refuses to compile until `en.ts` has it too.

```ts
import { createTranslator } from "@fg/i18n";

const t = createTranslator("ar");
t("gym.viewPlans"); // "عرض الاشتراكات"
t("gym.viewPlanz"); // compile error, not a blank label in production
```

Valid keys are derived from the dictionary itself, so autocomplete works and
typos are caught at build time.

---

## Notes for a C# developer

A few things that surprise people arriving from .NET:

- **Types vanish at runtime.** There is no reflection and no `typeof(T)`. The
  compiler cannot help you at an API boundary — validate incoming data
  explicitly. `lookup()` in `translate.ts` shows the shape of this.
- **Structural typing.** A type matches if its _shape_ matches. There is no
  `implements` keyword to write.
- **Discriminated unions** replace a lot of inheritance. See `MembershipStatus`
  in `packages/core/src/domain/membership.ts` — each state carries only the
  fields that state can have, and the compiler stops you reading a refund off a
  membership that was never cancelled. C# has no real equivalent.
- **`strict` is on**, plus `noUncheckedIndexedAccess`. Array access returns
  `T | undefined`, which is correct and occasionally annoying.

---

## Not built yet

`apps/web` and `apps/mobile` are empty. See `apps/README.md` for the commands
that generate them and how to wire `@fg/i18n` into each.

Two decisions are still blocking real work rather than scaffolding:

- **Payments** need a KNET merchant account, which needs a licensed entity.
  Build against the gateway sandbox until that exists.
- **The wallet** may be a regulated activity if it holds withdrawable money.
  Until a lawyer says otherwise, treat it as non-cashable platform credit.
