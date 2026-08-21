# Known advisories

## deepmerge-ts < 8.0.0 — accepted, not fixed

`npm audit` reports 3 high-severity findings that all trace to one package:
[GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) —
stack exhaustion in `deepmerge-ts` when merging deeply recursive object graphs.

**Why it is not fixed:**

- It reaches us only through `@prisma/config`, part of the **Prisma CLI** —
  a `devDependency`. It is never bundled into the app, never runs on the
  server at request time, and never sees user input.
- Triggering it requires feeding a recursive object graph into the merge. The
  only thing merged is our own `prisma.config.ts`, which we author.
- `npm audit fix` proposes **prisma 7.9.1 → 6.12.0**, a major downgrade.
  Prisma 7 is what this project is built on: the connection URL lives in
  `prisma.config.ts` and the client requires a driver adapter, neither of
  which exists in 6.x. The "fix" would break the database layer entirely.
- 7.9.1 is the current latest — there is no forward fix to upgrade to.
- Forcing `overrides: { "deepmerge-ts": "^8" }` was tried and npm left the
  tree in an `invalid` state without actually swapping the version.

**Re-check when:** Prisma ships a release depending on `deepmerge-ts@^8`.
Then simply upgrade `prisma` and delete this note.

Last reviewed: 2026-08-14 (prisma 7.9.1)
