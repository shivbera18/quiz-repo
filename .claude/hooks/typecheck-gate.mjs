#!/usr/bin/env node
// Stop gate: no turn ends with a broken build. Covers the 6 backend apps whose
// `lint` script is an echo stub (CLAUDE.md §19.2 gap #14) — typecheck is the only
// mechanical check they have, so make it non-optional.
// ponytail: turbo caches `typecheck`, so an unchanged tree is a sub-second no-op.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const ev = JSON.parse(readFileSync(0, "utf8"));
if (ev.stop_hook_active) process.exit(0); // already retrying; don't wedge the turn

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const sh = (cmd, args) =>
  spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: process.platform === "win32" });

const dirty = sh("git", ["status", "--porcelain"]).stdout ?? "";
const touched = dirty.split("\n").filter((l) => /\.(ts|tsx|prisma)$/.test(l));
if (touched.length === 0) process.exit(0);

const r = sh("pnpm", ["typecheck"]);
if (r.status === 0) process.exit(0);

const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n");
process.stderr.write(
  `\`pnpm typecheck\` fails — fix before ending the turn.\n${out.slice(-40).join("\n")}\n`,
);
process.exit(2);
