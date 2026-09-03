// A barrel file for the `domain` folder — see ../index.ts for the full
// explanation of what `export *` does and why barrels exist.
//
// This one is re-exported in turn by ../index.ts, so everything named in
// gym.ts and membership.ts becomes importable as `from "@fg/core"`.
export * from "./gym";
export * from "./membership";
