#!/usr/bin/env node
/**
 * Local PostgreSQL control.
 *
 * The database is a portable install (no Windows service, no Docker, no admin
 * rights), so it does not start with the machine. This wraps pg_ctl so you
 * never have to remember its flags:
 *
 *   npm run db:start
 *   npm run db:stop
 *   npm run db:status
 *
 * pg_ctl inherits the shell's stdio and keeps it open for as long as the
 * server runs, which makes a plain `pg_ctl start` appear to hang forever.
 * Spawning it detached with stdio ignored is what actually makes it return.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const PG_HOME = process.env["PG_HOME"] ?? "D:/2026/pgsql";
const PG_DATA = process.env["PG_DATA"] ?? "D:/2026/pgdata";
const PG_PORT = process.env["PG_PORT"] ?? "5433";

const exe = (name) =>
  path.join(PG_HOME, "bin", process.platform === "win32" ? `${name}.exe` : name);

if (!existsSync(exe("pg_ctl"))) {
  console.error(`Could not find pg_ctl at ${exe("pg_ctl")}`);
  console.error("Set PG_HOME if PostgreSQL lives somewhere else.");
  process.exit(1);
}

const command = process.argv[2];

if (command === "start") {
  const ready = spawnSync(exe("pg_isready"), ["-h", "127.0.0.1", "-p", PG_PORT], {
    encoding: "utf8",
  });
  if (ready.status === 0) {
    console.log(`PostgreSQL already running on port ${PG_PORT}.`);
    process.exit(0);
  }

  const child = spawn(
    exe("pg_ctl"),
    ["-D", PG_DATA, "-l", path.join(PG_DATA, "server.log"), "-o", `-p ${PG_PORT}`, "start"],
    { detached: true, stdio: "ignore" },
  );
  child.unref();

  // pg_ctl returns before the server finishes accepting connections.
  const deadline = Date.now() + 20_000;
  const poll = () => {
    const r = spawnSync(exe("pg_isready"), ["-h", "127.0.0.1", "-p", PG_PORT]);
    if (r.status === 0) {
      console.log(`PostgreSQL ready on port ${PG_PORT}.`);
      process.exit(0);
    }
    if (Date.now() > deadline) {
      console.error(`Timed out. Check ${path.join(PG_DATA, "server.log")}`);
      process.exit(1);
    }
    setTimeout(poll, 500);
  };
  poll();
} else if (command === "stop") {
  const r = spawnSync(exe("pg_ctl"), ["-D", PG_DATA, "-m", "fast", "stop"], {
    encoding: "utf8",
    stdio: "inherit",
  });
  process.exit(r.status ?? 0);
} else if (command === "status") {
  const r = spawnSync(exe("pg_isready"), ["-h", "127.0.0.1", "-p", PG_PORT], {
    encoding: "utf8",
  });
  console.log(r.stdout?.trim() || (r.status === 0 ? "accepting connections" : "not running"));
  process.exit(r.status ?? 0);
} else {
  console.error("Usage: node scripts/db.mjs <start|stop|status>");
  process.exit(1);
}
