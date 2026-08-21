import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import factory, { gate } from "../.omp/hooks/post/verify-gate.ts";

const orig = process.cwd();
const d = join(tmpdir(), `gate-${Date.now()}`);
mkdirSync(d, { recursive: true });
process.chdir(d);
execSync("git init -q");

console.assert(gate() === undefined, "FAIL clean repo should pass");
console.log("ok clean repo -> undefined");

mkdirSync("apps/assessment/src/lib", { recursive: true });
writeFileSync("apps/assessment/src/lib/scoring.ts", "");
const a = gate();
console.assert(a?.reason.includes("golden fixtures"), "FAIL scoring rule");
console.log("ok scoring w/o fixtures ->", a?.decision);

mkdirSync("apps/assessment/tests", { recursive: true });
writeFileSync("apps/assessment/tests/scoring.test.ts", "");
const b = gate();
console.assert(b?.reason.startsWith("pnpm typecheck failed"), "FAIL typecheck rule");
console.log("ok fixtures present -> falls through to", b?.decision, b?.reason.split("\n")[0]);

let seen = "";
factory({
	on: (event, handler) => {
		seen = event;
		console.assert(typeof handler === "function", "FAIL handler");
	},
});
console.assert(seen === "session_stop", "FAIL event name");
console.log("ok registered on", seen);

process.chdir(orig);
rmSync(d, { recursive: true, force: true });
console.log("ALL PASS");
