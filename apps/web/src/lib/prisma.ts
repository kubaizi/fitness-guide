import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * The one database client for the whole app.
 *
 * ## Why an adapter
 *
 * Prisma 7 no longer ships its own database driver. You hand it one — here
 * `PrismaPg`, which is the ordinary `pg` Postgres driver for Node. The
 * connection string is read here rather than inside the schema file, so the
 * password stays out of git.
 *
 * ## Why the global
 *
 * `next dev` reloads this module every time you save a file. A plain
 * `new PrismaClient()` would therefore open a fresh pool of connections on
 * every save, and after twenty saves Neon starts refusing new ones. Parking
 * the client on `globalThis` — which is not reloaded — means one pool that
 * survives every reload.
 *
 * In production the module is loaded once, so the global is never used. This
 * is the pattern Prisma's own Next.js guide recommends.
 */

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy apps/web/.env.example to apps/web/.env " +
        "and put your Neon connection string in it.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
