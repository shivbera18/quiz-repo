---
name: update
description: "Incrementally refresh the user's existing twin operating-profile from sessions created since the last run — never re-reading history. Use whenever the user says 'update my profile', 'refresh my operating profile', 'sync my profile', 'distill my recent sessions', 'my profile is stale', or after a stretch of new work when they ask whether their profile is current — even if they don't say the word 'twin'. If no profile exists yet, route to the `profile` skill instead."
---

# Incremental Profile Update

Refresh an EXISTING operating-profile with only what's new. A profile built once and never
refreshed decays into a horoscope; this playbook keeps it alive at a fraction of the full-build
cost. You (the harness) are the language model — no API key, **no code to run**; these are
instructions you execute with your own tools.

**Precondition.** `<work-dir>/claims.jsonl` and `<work-dir>/last-run.txt` must both exist (the
`profile` skill writes them). If either is missing, there is nothing to update — say so and
offer to run the full `profile` build instead. `<work-dir>` and `<plugin-root>` resolve exactly
as in `profile` (`${CLAUDE_PLUGIN_DATA}` / `${CLAUDE_PLUGIN_ROOT}` on Claude Code; `./.twin/`
otherwise).

**Autonomy.** Run end to end without per-step permission. Stop only if the precondition fails,
or before writing to the user's global config (consent, always).

## Workflow

### 1. Delta triage — only what's newer than the stamp
Read `<work-dir>/last-run.txt` (one UTC ISO-8601 timestamp). Read
`<plugin-root>/references/harnesses.md` for the globs, then keep only session files whose
**modified time is after the stamp**. Apply the same substance gate. Two exclusions specific to
updates:
- **Skip the session you are running in right now** — it is about twin itself and would
  self-reference.
- **Skip any session that is itself a twin run** (building, auditing, or querying this profile).
  Re-ingesting your own output inbreeds the profile.
Report the delta worklist (per-harness counts). If it is empty, say the profile is current as of
the stamp date and stop — that is a successful run, not a failure.

### 2. Distill the delta
Apply `<plugin-root>/references/distillation.md` to the new sessions exactly as the full build
does — same climb, same layers, same proper-noun ban, same claim schema. **Append** the new
facts to `<work-dir>/claims.jsonl`; never rewrite or drop existing lines at this step.

### 3. Re-synthesize over EVERYTHING
Re-run the full synthesis from `<plugin-root>/references/output-format.md` over the **entire**
claims.jsonl (old + new) — clustering, category derivation, ranking, conditions. Claims are
compact, so this is cheap, and it is what lets new evidence *strengthen* an old principle
(recurrence count goes up), *promote* a `(tentative)` line, or *split* a principle into a
conditioned pair. Never just append lines to the old AGENTS.md. Rewrite both compiled files,
then run the self-eval gate.

### 4. Report the diff, reinstall, restamp
Show the user what actually changed, not the whole file: principles **added**,
**strengthened** (recurrence up / tentative tag dropped), **reconditioned**, or **unchanged**
count. If the Operating Model was previously installed (look for the
`<!-- twin:operating-model -->` markers in global config), offer to replace the block in place —
with consent, showing the diff first. Finally write the new UTC timestamp to
`<work-dir>/last-run.txt`.

## Quality bar
- Only post-stamp sessions were read; the stamp was updated only after a successful run.
- Twin's own sessions and previously-generated profile text were never re-ingested.
- The compiled files were re-synthesized over all claims, not patched.
- The user saw a change-diff and the self-eval scores, and consented before any global write.
