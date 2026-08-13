import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * The shared Prisma client.
 *
 * Two things here are not optional:
 *
 * 1. Prisma 7 requires an explicit driver adapter — `new PrismaClient()` on
 *    its own throws. PrismaPg is the PostgreSQL one.
 *
 * 2. The client is cached on `globalThis` in development. Next.js hot-reload
 *    re-evaluates modules on every edit, and without this each reload would
 *    open a brand new connection pool until Postgres refuses new connections.
 *    In production the module is evaluated once, so the cache is skipped.
 *
 * Coming from EF Core: this is your DbContext, but it is a long-lived
 * singleton rather than a short-lived per-request object. Prisma manages the
 * connection pool internally, so you do not create and dispose one per query.
 */

const createClient = () => {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
