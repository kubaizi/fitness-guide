# The data store

These JSON files **are** the database for now. There is no database server,
no connection string, and no environment variable to configure — the files are
imported directly by `apps/web/src/lib/db.ts`, so they are bundled at build
time and work anywhere, including a Vercel deploy with nothing set up.

## Files

| File               | Contents                                    |
| ------------------ | ------------------------------------------- |
| `gyms.json`        | Gyms, with their photos and bilingual text  |
| `plans.json`       | Membership plans, linked by `gymId`         |
| `users.json`       | Demo accounts                               |
| `memberships.json` | Memberships, linked by `userId` and `gymId` |
| `payments.json`    | Payment records with the commission split   |

## Editing them

Change a value, save, refresh the page. That is the whole workflow — no
migration, no seed command, no server to restart.

Two rules worth keeping:

1. **Money is an integer count of fils.** `19900` is 19.900 KWD. Never write
   `19.9`. Kuwait's dinar has three decimal places, and every price in the app
   goes through `@fg/core`'s money module, which will throw on a fraction.
2. **Ids must match across files.** A plan's `gymId` has to be a real gym `id`,
   and a membership's `planId` a real plan `id`. Nothing enforces this the way
   a database's foreign keys would, so a typo produces a missing row rather
   than an error.

## Read-only

Nothing writes back to these files. On a serverless host the filesystem is
read-only and resets between requests, so a write would silently vanish. That
is why signing in does not create a user, and why "Pay" does not create a
membership — those need a real database.

## When a real database arrives

`docs/future-database-schema.prisma` holds the full schema, already designed
and previously migrated against PostgreSQL. Only `src/lib/db.ts` has to change:
every function there already returns the domain types from `@fg/core`, so no
screen knows where the data came from.
