/**
 * ═══════════════════════════════════════════════════════════════════════════
 * The public front door of the `@fg/core` package.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── What `export * from "./money"` does ──
 * "Re-export everything that money.ts exports, as though it were declared
 * here." This is called a BARREL FILE.
 *
 * ── Why bother? ──
 * Without it, every consumer would have to know the internal file layout:
 *
 *   import { formatKwd } from "@fg/core/src/money";
 *   import { admits }    from "@fg/core/src/domain/gym";
 *
 * With it, there is one import path and the internals stay free to move:
 *
 *   import { formatKwd, admits } from "@fg/core";
 *
 * ── Where does the name `@fg/core` come from? ──
 * From `packages/core/package.json`, whose `"name"` field is `@fg/core`. The
 * `@fg/` prefix is a SCOPE — a namespace, like a C# root namespace. Because
 * this repo is a monorepo (multiple packages in one repository, wired up by
 * npm workspaces), the package resolves to the local folder rather than being
 * downloaded from npm.
 *
 * ── The rule this file implies ──
 * Anything NOT re-exported here is effectively private to the package. Adding
 * a new file under src/ does not publish it; you must add a line below.
 */
export * from "./money";
export * from "./result";
export * from "./phone";
export * from "./password";
// This one points at another barrel file (src/domain/index.ts), which in turn
// re-exports gym.ts and membership.ts. Barrels nesting inside barrels is
// normal and keeps each directory in charge of its own public surface.
export * from "./domain/index";
