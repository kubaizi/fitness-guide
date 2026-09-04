import { fileURLToPath } from "node:url";

import { defineConfig } from "prisma/config";

/**
 * Prisma's own configuration, read by the `prisma` command line tool.
 *
 * Two things changed in Prisma 7 that are worth knowing, because every older
 * tutorial you will find online does it the old way:
 *
 *   1. The database URL is no longer written in schema.prisma. It lives here,
 *      read from the environment. That keeps the password out of a file we
 *      commit to git.
 *   2. Prisma no longer reads `.env` by itself. We do it below.
 *
 * `process.loadEnvFile` is built into Node 20.6 and later. It reads a file of
 * `KEY=value` lines into `process.env`. It throws if the file is missing, so
 * the try/catch keeps this working on Vercel, where there is no `.env` file at
 * all — the variables are already in the environment.
 *
 * `fileURLToPath` and not `new URL(...).pathname`: on Windows the second one
 * hands back "/D:/2026/..." with a leading slash, which is not a path any file
 * system call will accept.
 */
try {
  process.loadEnvFile(fileURLToPath(new URL(".env", import.meta.url)));
} catch {
  // No .env file. Fine: either the variables are already set, or `env()`
  // below will complain by name, which is a clearer error than this one.
}

// Prisma's own `env("DATABASE_URL")` helper does the same job, but when the
// variable is missing it reports "Cannot resolve environment variable" from
// inside a config file the reader has probably never opened. Since
// `prisma generate` runs on every `npm install` — including Vercel's — that
// message is the first thing a broken deploy shows. This one says what to do.
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is not set.\n" +
      "  Locally:  copy apps/web/.env.example to apps/web/.env and fill it in.\n" +
      "  On Vercel: Settings > Environment Variables, applied to Production,\n" +
      "             Preview and Development.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // How `prisma db seed` runs. tsx is not installed, so the seed is plain
    // JavaScript rather than TypeScript.
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    url,
  },
});
