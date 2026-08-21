#!/usr/bin/env node
// Self-check for the guard hook. `node .claude/hooks/guard.test.mjs`
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import assert from "node:assert/strict";

const run = (payload) =>
  spawnSync(process.execPath, [new URL("guard.mjs", import.meta.url).pathname.replace(/^\/(\w:)/, "$1")], {
    input: JSON.stringify(payload),
    encoding: "utf8",
  });

const bash = (command) => run({ tool_name: "Bash", tool_input: { command } });
const edit = (file_path) => run({ tool_name: "Edit", tool_input: { file_path } });

// Bash rules
assert.equal(bash("pnpm prisma migrate dev").status, 2, "migrate dev must block");
assert.equal(bash("pnpm db:migrate").status, 0, "migrate deploy must pass");
assert.equal(bash('redis-cli KEYS "*"').status, 2, "KEYS * must block");
assert.equal(bash("pnpm typecheck").status, 0, "ordinary command must pass");

// File rules — real repo files that currently satisfy the invariants
assert.equal(edit("packages/redis-kit/src/keys.ts").status, 0, "keys.ts is the sanctioned home for q: keys");
assert.equal(edit("packages/contracts/src/dto/attempts.ts").status, 0, "attempts DTO is clean today");
assert.equal(edit("apps/catalog/src/index.ts").status, 0, "catalog index is clean today");
assert.equal(edit("does/not/exist.ts").status, 0, "missing file is not a violation");

// File rules — synthetic violations
const tmp = "tmp/hooktest";
mkdirSync(`${tmp}/apps/catalog/src`, { recursive: true });
mkdirSync(`${tmp}/packages/redis-kit/src`, { recursive: true });
mkdirSync(`${tmp}/apps/web/lib`, { recursive: true });
mkdirSync(`${tmp}/apps/analytics/src`, { recursive: true });

writeFileSync(`${tmp}/apps/catalog/src/bad.ts`, "const s = JSON.parse(quiz.sections);\n");
assert.equal(edit(`${tmp}/apps/catalog/src/bad.ts`).status, 2, "raw JSON.parse in catalog must block");

writeFileSync(`${tmp}/packages/redis-kit/src/bad.ts`, "const k = `q:att:${id}`;\n");
assert.equal(edit(`${tmp}/packages/redis-kit/src/bad.ts`).status, 2, "inline q: key must block");

writeFileSync(`${tmp}/apps/web/lib/bad.ts`, 'import { PrismaClient } from "@prisma/client";\n');
assert.equal(edit(`${tmp}/apps/web/lib/bad.ts`).status, 2, "prisma in apps/web must block");

writeFileSync(`${tmp}/apps/analytics/src/bad.ts`, "function f() {\n  console.log(1);\n}\n");
assert.equal(edit(`${tmp}/apps/analytics/src/bad.ts`).status, 2, "console.log in a service must block");

rmSync(tmp, { recursive: true, force: true });
console.log("guard.mjs: 12/12 ok");
