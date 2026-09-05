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
 * In production the module loads once, so the global is only ever written to
 * and read back by the same copy of this file — it behaves exactly like a
 * plain module variable there. This is the pattern Prisma's own Next.js guide
 * recommends.
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

/** The client, built the first time something actually needs it. */
function getClient(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

/**
 * ## Why this is a Proxy and not just `const prisma = createClient()`
 *
 * It used to be exactly that, and it broke the build on Vercel.
 *
 * `next build` opens every page module to work out how it should be rendered.
 * Opening a page means running the imports at the top of it, and one of those
 * leads here. With a plain `const`, `createClient()` ran at that moment — so
 * merely *reading* a page demanded a database address, and the build died
 * before it rendered anything.
 *
 * A build should not need a database. It compiles code; it does not serve
 * requests.
 *
 * A `Proxy` wraps an object and lets you decide what happens when someone
 * reads a property from it. Here the wrapped object is empty, and the `get`
 * trap below runs on every read — `prisma.gym`, `prisma.$transaction`, and so
 * on. So importing this file does nothing at all. The client is built on the
 * first real query, which only ever happens while serving a request, by which
 * time the environment variable is certainly there.
 *
 * The `.bind(client)` matters. `Reflect.get` hands back a plain function, and
 * a JavaScript method forgets which object it came from once detached — call
 * it and `this` is undefined. Binding reattaches it. Without that line
 * `prisma.$disconnect()` would throw, while `prisma.gym.findMany()` would work
 * (`prisma.gym` is an object, not a method), which is the sort of half-broken
 * that takes an afternoon to pin down.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
