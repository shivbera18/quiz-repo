import { execSync } from "node:child_process"

// Seeds deterministic fixtures (admin-001, student-001, sample-quiz-001) before the
// e2e suite runs. prisma/seed.ts upserts with a full `update` clause, so re-running
// this always resets to the same baseline regardless of what a previous run mutated.
export default function globalSetup() {
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" })
}
