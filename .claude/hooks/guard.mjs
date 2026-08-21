#!/usr/bin/env node
// Deterministic enforcement of the CLAUDE.md §19.1 invariants an agent can drift on.
// Wired as PostToolUse(Edit|Write) + PreToolUse(Bash). Exit 2 = block, stderr goes to the model.
// ponytail: regex on the whole file, not AST. Move to ast-grep only if false positives appear.
import { readFileSync } from "node:fs";

const RULES = [
  {
    when: /packages[\\/]contracts[\\/]src[\\/]dto[\\/]attempts\.ts$/,
    bad: /correctAnswer|explanation/,
    msg: "§19.1 #1: AttemptQuestionDTO must never carry answer keys. Keys live only in FullQuizQuestionDTO (dto/catalog.ts).",
  },
  {
    when: /\.ts$/,
    skip: /redis-kit[\\/]src[\\/]keys\.ts$/,
    bad: /["'`]q:[a-z]/,
    msg: "§19.1 #7: inline Redis key. Add a builder to packages/redis-kit/src/keys.ts and call it.",
  },
  {
    when: /apps[\\/]catalog[\\/]src[\\/].*\.ts$/,
    bad: /JSON\.parse\(/,
    msg: "§9.2: Quiz.sections/questions and QuestionBankItem.options/tags are JSON-in-String. Use parseJsonField from src/lib/database-utils.ts.",
  },
  {
    when: /apps[\\/]web[\\/].*\.(ts|tsx)$/,
    bad: /@prisma\/client|generated[\\/]prisma|process\.env\.DATABASE_URL/,
    msg: "§19.1 #9: apps/web has no database access. Its only egress is proxyToGateway (lib/gateway-client.ts).",
  },
  {
    when: /apps[\\/](gateway|identity|catalog|assessment|analytics|notification)[\\/]src[\\/].*\.ts$/,
    bad: /^\s*console\.log\(/m,
    msg: "§22: no console.log in a service. Use createLogger(serviceName) from @quiz/observability.",
  },
  {
    when: /apps[\\/]gateway[\\/]src[\\/]index\.ts$/,
    bad: /prefix:\s*["'`]\/internal/,
    msg: "§19.1 #3: never register an /internal/* prefix on the gateway — that is what keeps answer keys unreachable.",
  },
];

const BASH_RULES = [
  {
    bad: /prisma\s+migrate\s+dev/,
    msg: "§19.1 #11: use `prisma migrate deploy`. `migrate dev` can drop data.",
  },
  {
    bad: /\bKEYS\s+["'`]?\*/,
    msg: "§16.1: KEYS * must never run against this Redis.",
  },
];

const ev = JSON.parse(readFileSync(0, "utf8"));
const fail = (msg) => {
  process.stderr.write(`BLOCKED by .claude/hooks/guard.mjs\n${msg}\n`);
  process.exit(2);
};

if (ev.tool_name === "Bash") {
  const cmd = ev.tool_input?.command ?? "";
  for (const r of BASH_RULES) if (r.bad.test(cmd)) fail(r.msg);
  process.exit(0);
}

const file = ev.tool_input?.file_path;
if (!file) process.exit(0);
let src;
try {
  src = readFileSync(file, "utf8");
} catch {
  process.exit(0); // deleted or moved; nothing to check
}
for (const r of RULES) {
  if (!r.when.test(file)) continue;
  if (r.skip?.test(file)) continue;
  if (r.bad.test(src)) fail(`${file}\n${r.msg}`);
}
