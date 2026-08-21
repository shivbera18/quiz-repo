---
name: profile
description: "Build the user's portable operating-profile from their lived agent sessions across every harness on this machine (Claude Code, codex, Cursor, Gemini CLI, Aider, opencode, Copilot, hermes, and any others). Harvests sessions and memory, climbs how the user operates into layered, proper-noun-free principles, and synthesizes a portable Operating Model (plus a dated Environment Ledger) their agents can load. Use this whenever the user says 'profile me', 'build my operating profile', 'what does my agent know about how I work', 'capture how I work', 'make an AGENTS.md for me', or invokes the profile command — even if they don't say the word 'twin'."
---

# Operator Profiling

Turn the user's scattered agent sessions into a PORTABLE operating-profile — a transfer of *how
they operate*, not a log of what they did. You (the harness) are the language model for this
job: there is no API key, no external model, and **no code to run**. This plugin is markdown
instructions; you do the work with your own tools (Glob, Read, a shell one-liner for triage)
guided by the reference files. Everything is local; nothing leaves the machine.

Use this skill when the user wants their *operating model* captured, not when they want to edit
one specific config file or read one transcript. The single hardest part of the job, and the
thing that makes the output worth anything, is **altitude**: climb from behavior to principle,
and keep the portable model strictly separate from disposable environment specifics.

**Autonomy.** Run the whole pipeline without stopping to ask permission for each step — the user
invoked this to get a profile, so produce one. State assumptions as you go. Only stop in two
cases: (1) there is nothing to read (no harness data found), or (2) you are about to **write to
the user's global config** — that always needs explicit consent (see install routing).

## What you produce
Two compiled files in the work-dir, plus the structured source they come from:
- **`AGENTS.md`** — the **Operating Model**: 8–12 portable, proper-noun-free principles grouped
  under categories derived to fit the user's actual role. Installs to GLOBAL config. The product.
- **`environment-ledger.md`** — a **dated** list of the user's current repos / tools / tables.
  Installs PER-PROJECT. Quarantined out of the Operating Model.
- **`claims.jsonl`** — every distilled fact with its evidence; the regenerable source of truth.

## Paths (harness-agnostic)
- **`<plugin-root>`** = this plugin's installed directory (`${CLAUDE_PLUGIN_ROOT}` on Claude
  Code; otherwise resolve this plugin's install path).
- **`<work-dir>`** = a writable output folder (`${CLAUDE_PLUGIN_DATA}` on Claude Code; otherwise
  `./.twin/`). Create it if absent.

## Workflow

### 1. Triage — find the sessions worth reading
Read **`<plugin-root>/references/harnesses.md`** — it is the map: per harness,
the sessions glob, the exact JSONL shape (with sample lines), the memory files, the noise to
ignore, the secrets to redact, and the substance gate.

Enumerate candidate session files across every installed harness (the registry's triage
one-liner is the cheap way), drop the obviously-tiny files with the line-count pre-filter, and
build a **worklist** of survivors (path + harness). Also collect the memory files the registry
lists. Report the per-harness counts. If the worklist is empty, say so and stop.

### 2. Distill — climb behavior to principle (you are the LLM)
Read **`<plugin-root>/references/distillation.md`** — it is the contract:
the climb, the three layers (`mental_model` / `operating_habit` / `environment`), the
proper-noun ban, the north-star test, free-text operating-dimension `theme`s (final categories
are derived later at synthesis, NOT a fixed engineering list), conditions, and the worked
examples that show good vs bad.

Read each survivor's **raw JSONL directly** (use the registry's schema; there is no pre-cleaned
copy). If your harness has a parallel subagent / Task tool, batch ~5 sessions per subagent and
give each the paths to `references/harnesses.md` and `references/distillation.md` to read first;
otherwise process sequentially. While reading, confirm the real message count and the
eval/automation check from the gate, and skip any session that fails. Append every fact (full
schema) as one JSON line to **`<work-dir>/claims.jsonl`**. Drop any fact whose evidence would
contain a secret.

### 3. Synthesize — operating model on top, environment quarantined
Read **`<plugin-root>/references/output-format.md`** — it has the exact templates
and the synthesis recipe. Cluster equivalent principles across all sessions and harnesses,
**derive a small set of categories that fit the user's actual role** (engineer, PM, designer,
CX, sales, ops — never a fixed engineering list), rank by recurrence, keep the Operating Model
to 8–12 lines, preserve conditions, and tag one-offs `(tentative)`. Write
`<work-dir>/AGENTS.md` (Operating Model) and
`<work-dir>/environment-ledger.md` (dated ledger) using the templates exactly.

### 4. Self-eval — the portability gate
Per `output-format.md`, compute and SHOW the **portability %**, list any **proper-noun leaks**
in the Operating Model (climb each, or move it to the ledger, then re-compute), and report the
counts. If the Operating Model is mostly environment trivia, say so loudly and fix it before
delivering — never silently ship a horoscope.

### 5. Deliver and install — route the two layers differently
Show the user both files and the self-eval scores. Then offer to install, with consent, showing
exactly what you'll write first:
- **Operating Model → GLOBAL** (`~/.claude/CLAUDE.md` or `~/.codex/AGENTS.md`), wrapped in the
  `twin:operating-model` markers so a re-run replaces the block instead of duplicating it.
- **Environment Ledger → PER-PROJECT** (the current project's config) or left in the work-dir.

Finally, **stamp the run**: write the current UTC ISO-8601 timestamp to
`<work-dir>/last-run.txt`. The `update` skill reads this stamp to refresh incrementally —
without it, every refresh is a full rebuild.

## Quality bar
Before you call it done, check:
- Every Operating-Model line passes the north-star test and contains **zero proper nouns**.
- The Operating Model is **8–12 lines**, ranked by recurrence, with one-offs tagged `(tentative)`.
- **Categories fit the person's real role** — a small derived set (≈4–7), each holding more than
  one principle; not forced into engineering buckets.
- Context-dependent **conditions are preserved**, never flattened into one averaged rule.
- The Environment Ledger holds the disposable specifics, dated, and **nothing** environment-y
  leaked into the Operating Model.
- You reported the portability %, the leak list (ideally empty), and the counts.
- You did not write to global config without explicit consent.

## Reference files (at `<plugin-root>/references/`, shared by the whole suite)
- `harnesses.md` — where sessions + memory live and how to read each harness. **Step 1–2.**
- `distillation.md` — how to climb a transcript into facts, with worked examples. **Step 2.**
- `output-format.md` — exact `AGENTS.md` template, self-eval rubric, install routing. **Step 3–5.**

## After the build — the profile is meant to stay alive
This skill is the **full build**. Once it exists, point the user at the sibling skills (same
work-dir, same references): **`update`** distills only sessions newer than the last run,
**`audit`** grades every claim against its evidence, and **`query`** answers "how do I usually
handle X?" from the claims with citations. A profile that is built once and never refreshed
decays into a horoscope; the suite exists so it doesn't.

## Governance
Local only. Secrets redacted at read time; drop any fact that would carry one. The user owns the
output — deleting the work-dir removes everything; re-run to refresh.
