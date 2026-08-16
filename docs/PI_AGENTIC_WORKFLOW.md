# Pi Agentic Coding Guide

This repository is configured for a full Pi workflow with project skills, specialist subagents, current documentation research, browser automation, code diagnostics, task tracking, and MCP servers.

## 1. Start Pi

From the repository root:

```powershell
cd C:\path\to\quiz-repo
pi
```

On first use, approve project trust. After configuration changes, run:

```text
/reload
```

Useful startup checks:

```text
/subagents-doctor
/mcp status
/lens-health
/todos
```

Project resources load only when Pi starts in this repository and the project is trusted.

## 2. How To Command Pi

You normally use plain language. State the goal, constraints, expected behavior, and verification instead of prescribing every edit.

Good task prompt:

```text
Fix duplicate quiz submissions when the timer and manual submit race.
Preserve the existing attempt snapshot and outbox behavior. Add a regression test,
run assessment typecheck/tests, review the final diff, and do not commit yet.
Track the work as todos.
```

Weak task prompt:

```text
Fix quiz bug.
```

For substantial work, include:

- **Goal**: observable behavior that should change.
- **Scope**: relevant service/page and explicit exclusions.
- **Constraints**: compatibility, architecture, security, or migration rules.
- **Acceptance criteria**: cases that must work.
- **Verification**: tests, typecheck, build, browser flow, or review.
- **Git action**: whether to commit and push. Pi should not infer this.

## 3. Skills

Skills provide repository-specific workflows and guardrails. Pi can select them automatically, but explicit invocation is more predictable:

```text
/skill:quiz-attempt-lifecycle fix stale autosaves arriving after submission
/skill:ai-quiz-generation validate Gemini output with Zod and preserve partial jobs
/skill:authentication-and-sessions plan a migration from plaintext passwords
/skill:contracts-and-events add a backward-compatible event field
/skill:testing-and-quality add regression coverage for this bug
/skill:security-review audit answer-key exposure
```

See available commands by typing `/skill:` in Pi.

Use one primary domain skill for implementation, then a testing or security skill for a second pass when risk warrants it.

## 4. Subagents

`pi-subagents` delegates focused work to child Pi sessions. Ask in natural language:

```text
Use scout to map the attempt submission flow and report relevant files and risks.
Use worker to implement the approved plan.
Use reviewer to review the current diff for correctness and missing tests.
Ask oracle to challenge this design before any edits.
Use researcher to check current official KafkaJS retry guidance.
```

### Built-in agents

| Agent | Purpose |
| --- | --- |
| `scout` | Fast repository reconnaissance and handoff context |
| `researcher` | Current web/documentation research with sources |
| `worker` | Focused implementation and validation |
| `reviewer` | Independent code or plan review |
| `oracle` | Read-only second opinion for risky decisions |
| `delegate` | General child task |

### Project agents

| Agent | Purpose |
| --- | --- |
| `beast-mode` | Persistent multi-step implementation with tracking and review |
| `copilot.ask` | Read-only explanation and architecture questions |
| `copilot.explore` | Converted Copilot exploration role |
| `copilot.plan` | Read-only researched implementation planning |
| `accessibility-reviewer` | WCAG, keyboard, focus, semantics, forms, and motion |
| `playwright-tester` | Browser-flow exploration and Playwright test implementation |
| `sast-sca-reviewer` | Evidence-based source and dependency security audit |
| `frontend-performance-reviewer` | Runtime and Core Web Vitals investigation |
| `library-docs-researcher` | Version-aware official library documentation research |

List live agents:

```text
Show me the available subagents.
```

Inspect active/background work:

```text
/subagents-fleet
```

## 5. Agentic Workflow

### Small change

```text
Use the relevant skill. Inspect the existing pattern, implement the smallest fix,
run the focused typecheck/test, inspect the diff, and report results. Do not commit.
```

### Normal feature or bug fix

```text
Track this as todos.
1. Use scout to map the affected flow and tests.
2. Present a short plan and call out decisions that need approval.
3. After approval, use worker to implement it.
4. Run focused verification.
5. Use reviewer on the final diff.
6. Apply valid findings and rerun checks.
Do not commit or push until I request it.
```

### Risky cross-service change

```text
Use copilot.plan with fresh context to research this cross-service change.
Have oracle challenge event compatibility, authorization, migration, and rollback assumptions.
Wait for my approval before implementation. Then use worker, followed by independent
correctness and security reviewers. Keep commits small and do not push until requested.
```

### Parallel review

```text
/parallel-review Review the current diff for correctness, tests, security, and unnecessary complexity.
```

Or explicitly:

```text
Run parallel read-only reviews:
- reviewer for correctness and regressions
- sast-sca-reviewer for security
- accessibility-reviewer for UI accessibility
- frontend-performance-reviewer for measurable performance risks
Consolidate duplicate findings and do not edit during review.
```

### Review loop

```text
/review-loop Review this implementation, apply valid findings with worker, rerun focused
checks, and repeat until clean or 3 rounds. Stop on any unapproved architecture decision.
```

Useful packaged workflows also include:

```text
/gather-context-and-clarify
/parallel-research
/parallel-cleanup
```

## 6. MCP Servers

MCP is available through the parent Pi session using a compact `mcp` proxy tool.

Configured servers:

- `context7`: current framework and library documentation.
- `playwright`: headless browser inspection and interaction.
- `project-memory`: local project knowledge graph.

Commands:

```text
/mcp
/mcp status
/mcp reconnect context7
/mcp reconnect playwright
/mcp reconnect project-memory
```

Natural prompts:

```text
Use Context7 to verify Fastify 5 request validation guidance, then compare it with our code.
Use Playwright MCP to test login, start a quiz, autosave, submit, and inspect console errors.
Read project memory for prior architecture decisions before planning this change.
Remember that analytics projections must tolerate cross-topic ordering.
```

Current limitation: MCP tools work reliably in the parent Pi session. Project subagents use native tools, skills, `pi-web-access`, or Playwright scripts because direct MCP inheritance into child sessions is not reliable in the current Windows project-local setup. Ask the parent to collect MCP evidence first, then pass the findings to a subagent.

Example:

```text
Use Context7 in the parent session to gather current Next.js guidance. Then give that evidence
to oracle to evaluate whether it fits this repository. Do not let the child invent external facts.
```

MCP details are documented in [`.pi/MCP.md`](../.pi/MCP.md).

## 7. Browser And UI Workflow

For a frontend change:

```text
/skill:frontend-feature implement the requested UI behavior.
Use Playwright MCP in the parent session to inspect the rendered page at desktop and mobile sizes.
Check console/network errors, keyboard operation, loading/empty/error states, and screenshots.
Then use accessibility-reviewer and run the relevant Playwright spec.
```

Do not treat a successful TypeScript build as visual verification. For service-worker behavior, use a production build.

## 8. Current Documentation Workflow

Use repository evidence first. For external APIs or version-sensitive behavior:

```text
Use Context7 to check the official docs for the installed major version.
Read the package manifest and lockfile first. Cite the documentation used and identify
any version mismatch. Do not edit until the recommendation is reconciled with local patterns.
```

Use `researcher` or `library-docs-researcher` for broader official-source research. Use Context7 directly from the parent when exact library API documentation is needed.

## 9. Verification

Request focused checks first:

```text
Run typecheck and tests only for affected packages. If contracts or shared packages changed,
include all direct consumers. Run the broader build only when the blast radius warrants it.
```

Common commands:

```bash
pnpm --filter web typecheck
pnpm --filter web build
pnpm --filter web test:e2e
pnpm --filter assessment-svc typecheck
pnpm --filter assessment-svc test
pnpm --filter @quiz/contracts typecheck
pnpm typecheck
pnpm test
pnpm build
```

For infrastructure:

```bash
docker compose -f infra/docker-compose.yml config
```

Always require the final report to distinguish passed checks, failed checks, and checks not run.

## 10. Git Workflow

Implementation and Git publication are separate decisions.

Before committing:

```text
Review git status and the full diff. Exclude unrelated user files. Group only related changes
into small conventional commits. Show me the proposed commit groups before committing.
```

Commit but do not push:

```text
Create small conventional commits for the completed work. Do not include unrelated files.
Do not push.
```

Commit and push:

```text
Create small thematic commits, fetch origin, rebase onto the latest target branch if clean,
rerun relevant validation, and push to origin/main. Never force-push. Report commit hashes.
```

Never ask Pi to use destructive Git commands casually. Preserve unrelated modified or untracked files.

## 11. Recovery And Diagnostics

Reload resources:

```text
/reload
```

Subagent problems:

```text
/subagents-doctor
/subagents-guide agents
/subagents-models
/subagents-fleet
```

MCP problems:

```text
/mcp status
/mcp reconnect <server>
```

Package management:

```powershell
pi list
pi config -l
pi update --extensions
```

Do not run unpinned package updates in the middle of unrelated implementation work.

## 12. Recommended Master Prompt

Use this for a complete autonomous coding task:

```text
Implement: <goal>.

Acceptance criteria:
- <observable behavior 1>
- <observable behavior 2>
- <important edge case>

Constraints:
- preserve existing architecture and unrelated changes
- do not expose secrets or weaken authorization
- use shared contracts for cross-boundary payloads
- do not make destructive database or Git changes

Workflow:
- track the task as todos
- use the relevant project skill
- use scout for repository context when needed
- research official current docs only where version-sensitive
- present a short plan if there are meaningful design choices
- implement with focused edits
- add regression tests
- run relevant typecheck/tests/build
- review the final diff with reviewer and the appropriate specialist
- apply valid findings and reverify

Git:
- do not commit or push until explicitly requested

Final report:
- summarize behavior changed
- list files changed
- list validation results
- state residual risks or unverified behavior
```

This gives Pi autonomy over execution while keeping architecture, safety, evidence, and publication under explicit control.
