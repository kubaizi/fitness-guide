import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 moved the connection URL out of schema.prisma and into this file.
 * Putting `url = env("DATABASE_URL")` in the schema is now a hard error.
 *
 * `dotenv/config` is imported because the Prisma CLI runs standalone — it
 * does not go through Next.js, so nothing else would load .env for it.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
