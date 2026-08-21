// Stop-gate: refuses to end a turn while this repo's cheap invariants are unverified.
// Fires once per turn on the main session only (never subagents), so it costs one
// turbo-cached typecheck, not one per edit.
import { execSync } from "node:child_process";

type Block = { decision: "block"; reason: string };

export function gate(): Block | undefined {
	let changed: string[];
	try {
		changed = execSync("git status --porcelain=v1", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
			.split("\n")
			.map((l) => l.slice(3).trim())
			.filter(Boolean);
	} catch {
		return; // not a git repo — nothing to gate
	}

	// CLAUDE.md §19.1 invariant 12: scoring changes require fixture updates.
	if (
		changed.some((f) => /apps\/assessment\/src\/lib\/scoring\.ts$/.test(f)) &&
		!changed.some((f) => /scoring\.test\.ts$/.test(f))
	) {
		return {
			decision: "block",
			reason:
				"scoring.ts changed without apps/assessment/tests/scoring.test.ts. Update the golden fixtures and state the reason (CLAUDE.md §19.1 invariant 12).",
		};
	}

	if (!changed.some((f) => /^(apps|packages)\/.+\.tsx?$/.test(f))) return;

	try {
		execSync("pnpm -s typecheck", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
	} catch (e) {
		// execSync attaches captured stdout/stderr to the thrown Error; Node's type omits them.
		const failure = e as { stdout?: string; stderr?: string };
		const out = `${failure.stdout ?? ""}${failure.stderr ?? ""}`.trim().slice(-2500);
		return { decision: "block", reason: `pnpm typecheck failed:\n${out}` };
	}
}

export default function (pi: { on(event: string, handler: () => unknown): void }) {
	pi.on("session_stop", () => gate());
}
