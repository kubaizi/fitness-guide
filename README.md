# Fitness Guide

A fitness marketplace for Kuwait. Release one covers **gyms only**: discovery,
membership purchase, QR check-in, and the dashboards gyms and admins need to
operate it.

Arabic is the default language. English is a full peer, not an afterthought.

---

## Getting started

```bash
npm install
npm run dev
```

That is the whole setup. **There is no database to install or start** — the
app reads JSON files from `apps/web/db/`, so it runs anywhere with nothing
configured.

`npm test` gives you 47 passing tests if you want to check the toolchain.

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
│   │   └── db/         JSON data files — the "database" for now
│   └── mobile/         Expo — the customer app (not generated yet)
├── docs/               future-database-schema.prisma, for when a DB returns
└── packages/
    ├── core/           Money, domain types, passwords — no UI, no framework
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

## Signing in

There are **two sign-in doors**, because the two audiences are doing different
jobs and one form describing both described neither:

| Door        | URL                       | For                          | Lands on          |
| ----------- | ------------------------- | ---------------------------- | ----------------- |
| **Members** | `/{locale}/login`         | people who buy memberships   | My memberships    |
| **Gyms**    | `/{locale}/partner/login` | gym owners, staff, and admin | the gym dashboard |

Both doors are linked from the header when signed out — **Sign in** for
members, **Gym sign in** beside it — and stacked in the mobile drawer, so
neither audience has to guess. An account may only use its own door. Right
password at the wrong door gets no session — just a message and a link to the
correct one. Each guarded page sends
signed-out visitors to the door that fits: `/memberships` to the member door,
`/manage/*` and `/admin/*` to the gym door.

| Username   | Phone      | Role      | Password | Sees                        |
| ---------- | ---------- | --------- | -------- | --------------------------- |
| `emad`     | `51338855` | member    | `123`    | Memberships                 |
| `rodi`     | `50946363` | member    | `123`    | Memberships                 |
| `ironclub` | `55512345` | gym owner | `123`    | **My gym** → Iron Club only |
| `admin`    | —          | admin     | `123`    | **Everything** — see below  |

Plus ten seeded members (`yousef`, `bader`, `khaled`, … also `123`) who exist
to give the gym dashboard a roster worth reading.

Admin sees the whole platform from `/{locale}/admin`, which has six sections
of its own: overview, gyms, users, memberships, check-ins and payments. It can
also open any gym's dashboard. The header carries a single **Admin** link
rather than one per section — the console navigates itself.

The header shows the name of whoever is signed in, so a session left open is
visible rather than mysterious. Sessions last 30 days — if the navigation shows
more than you expect, you are probably still signed in from earlier.

Either the username or the phone number works. Passwords are scrypt-hashed
with a per-user salt in `apps/web/db/users.json` — `123` is a demo password,
but the storage is the real shape.

There is no sign-up — the accounts above are the whole user list.

The navigation is decided on the server from the signed-in role, so a link the
visitor is not entitled to never reaches the browser at all.

## Data

`apps/web/db/*.json` holds every gym, plan, user and membership. Edit a file,
refresh the page — no migration, no seed, no server. See
[apps/web/db/README.md](apps/web/db/README.md) for the two rules that matter
(money is integer fils; ids must match across files).

The **gym dashboard writes back**: saving a profile or a plan rewrites the JSON
on disk, and the public pages update immediately via `revalidatePath`. Where
the filesystem is read-only — Vercel, for one — the same save falls back to an
in-memory edit and the screen says so plainly rather than pretending it stuck.

Everything else is still read-only: signing in does not create an account, and
"Pay" does not create a membership. Both need a real database.

Prettier deliberately ignores `apps/web/db/*.json` (see `.prettierignore`).
The app writes them with `JSON.stringify(…, 2)`; if Prettier reformatted them
too, every save would rewrite unrelated records and bury the real change.

[docs/product-decisions.md](docs/product-decisions.md) records what Emad has
actually decided — the ten sections, how branches work, ordering rules, the
10% commission, and what is still open. Check it before guessing at product
behaviour; three rounds of questions went into it.

`docs/future-database-schema.prisma` is the full PostgreSQL schema, already
designed and previously migrated. When a backend is chosen — Azure, AWS, or
Postgres again — only `apps/web/src/lib/db.ts` changes.

## Still blocked on decisions, not code

- **Payments** need a KNET merchant account, which needs a licensed entity.
- **The wallet** may be a regulated activity if it holds withdrawable money.
  Until a lawyer says otherwise, treat it as non-cashable platform credit.
