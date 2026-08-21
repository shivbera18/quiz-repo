# Reference: distillation contract — climb to the principle, separate the layers

Read this BEFORE writing any fact. It governs the climb from behavior to PRINCIPLE, the three
layers, the proper-noun ban, the north-star test, free-text operating-dimension themes (final
categories are derived at synthesis, not here), conditional claims, and how to treat memory files. Your input is the **raw JSONL** of a session (and sometimes a
memory file) — use `harnesses.md` for the per-harness schema, the noise to ignore, and the
secrets to redact. The promise is portability of the user's mental model, not a log of what
they did.

## Contents
- [The two failures to avoid](#the-two-failures-to-avoid)
- [The north-star test (apply to every fact)](#the-north-star-test-apply-to-every-fact)
- [Climb the abstraction ladder](#climb-the-abstraction-ladder)
- [The three layers](#the-three-layers)
- [Claim schema](#claim-schema)
- [Themes, not a fixed taxonomy](#themes-not-a-fixed-taxonomy)
- [Conditions = context, not contradiction](#conditions--context-not-contradiction)
- [Worked examples](#worked-examples)
- [Memory-sourced material](#memory-sourced-material)
- [Skip entirely](#skip-entirely)
- [Output](#output)

## The two failures to avoid
1. **Wrong altitude** — storing the behavior and its proper nouns instead of the principle
   behind it. "branches off `beta`" is a log entry; "branches off the team's integration
   branch, never assumes main is the base" is the operating model.
2. **Mixed layers** — letting disposable environment specifics (repos, branches, files,
   tenants, tools) sit in the same stream as transferable principles.

## The north-star test (apply to every fact)
> "Would this still be true and useful on a project the person has never touched?"

- **No** → it is `environment`. Tag it and quarantine it; it never enters the operating model.
- **Yes, but it names a specific repo / branch / file / tool / tenant / table / env-var** →
  it is UNDER-ABSTRACTED. **Climb it**: write the principle WITHOUT the proper noun, and put
  the proper noun in `example` / `evidence`.

## Climb the abstraction ladder
For every behavior, ask "what is this an instance of?" Store the principle, not the instance.
Never store a `mental_model` or `operating_habit` fact whose `principle` or `condition`
contains a proper noun. If you can't phrase it without one, you haven't climbed high enough.

## The three layers
- **`mental_model`** — how they THINK: their bar for proof, risk posture, what they optimize
  for, how they decide scope and tradeoffs. This is the asset. Prize these.
- **`operating_habit`** — how they WORK: commit style, review cadence, when they ask vs act,
  verification habits. Transferable behavior.
- **`environment`** — current repos, branches, files, tenants, tools, env vars, tables.
  Disposable, dated context. Never the operating model.

## Claim schema
One JSON object per fact:
```json
{
  "id":         "<stable slug: kebab-case theme + source stem + counter, e.g. branching-workflow-api-a1b2-1>",
  "principle":  "<one sentence; transferable; NO proper nouns>",
  "layer":      "mental_model | operating_habit | environment",
  "condition":  "<when it applies; NO proper nouns; empty string for a general default>",
  "why":        "<what it optimizes for / the reasoning behind it — the mental model>",
  "theme":      "<2–4 plain words naming the operating dimension; free text, NOT a fixed list>",
  "evidence":   "<short verbatim quote; proper nouns allowed here>",
  "example":    "<the concrete instance from this session, e.g. a branch/file/tool; allowed here>",
  "source_session": "<file stem>",
  "relations":  []
}
```
`why` is first-class — it carries the mental model; do not skip it. `principle` and `condition`
are the portable fields and MUST be proper-noun-free.

`id` makes the claim addressable (audits, queries, and relations point at it); build it from
the theme + source stem + a counter so parallel batches can't collide. `relations` stays an
**empty array at extraction** — you only see one session here, so you can't know what a claim
refines or conflicts with. The **link pass at synthesis** fills it over the whole corpus (see
`output-format.md`); entries look like `{"type": "refines" | "conflicts_with" | "depends_on",
"target": "<id>"}`.

## Themes, not a fixed taxonomy
Name the **operating dimension** each fact is about in 2–4 plain words (the `theme` field) —
e.g. "proof before claims", "when to escalate", "scope discipline", "objection handling",
"branching workflow". Do NOT force facts into engineering buckets. twin profiles engineers, but
also PMs, designers, CX agents, salespeople, and ops — a fixed "code quality" taxonomy is
meaningless for most of them and misses what actually defines them.

The `theme` is only a clustering hint; keep it honest and at the right altitude (a *mode of
operating*, not the task topic). The canonical, role-fit **category set is derived later, at
synthesis** (see `output-format.md`), over the whole corpus — so it fits THIS person and stays
consistent. You do not choose final categories here.

## Conditions = context, not contradiction
When two principles seem to conflict, find the distinguishing condition and keep BOTH. Never
flatten, never pick a winner. Conditions must also be proper-noun-free. Example pair:
- principle "defer automated tests" · condition "when the work is a throwaway experiment or spike"
- principle "require green CI before calling work done" · condition "when changing an existing or production system"

## Worked examples
The whole job is the climb. Here is what good and bad look like on real transcript snippets.

**Example 1 — climb past the proper nouns.**
Transcript: the user says *"don't merge into `main` directly, cut it from `release-2.4` and
open the PR against that — main is what we ship."*
- ❌ Bad (under-abstracted, proper noun in the principle):
  ```json
  {"principle":"branches off release-2.4 and opens PRs against it","layer":"operating_habit","condition":""}
  ```
- ✅ Good (climbed; the noun moves to `example`):
  ```json
  {"id":"branching-workflow-api-a1b2-1","principle":"branches off the team's integration branch and never assumes the default branch is the base","layer":"operating_habit","condition":"when contributing to a shared repo with a separate release branch","why":"keeps unshipped work off the branch that deploys, so an in-progress change can't reach production by accident","theme":"branching workflow","evidence":"cut it from release-2.4 … main is what we ship","example":"release-2.4 as the integration branch","source_session":"api__a1b2","relations":[]}
  ```

**Example 2 — a mental_model fact, with the *why*.**
Transcript: the user repeatedly asks the agent to *"show me the row count and the date range
before you quote any top-N — I don't trust a ranking the sample can't support."*
- ✅ Good:
  ```json
  {"id":"evidence-before-claims-analytics-9f3c-1","principle":"states the sample size and coverage before quoting a ranking, and refuses a top-N the data can't support","layer":"mental_model","condition":"when presenting an aggregate or ranking from queried data","why":"guards against confident conclusions drawn from thin or skewed samples","theme":"evidence before claims","evidence":"show me the row count and the date range before you quote any top-N","example":"asked for row count + min/max date on a metrics table","source_session":"analytics__9f3c","relations":[]}
  ```

**Example 3 — environment, quarantined (do NOT climb it into the operating model).**
Transcript: *"our staging DB is at the `stg_` prefix and you need the VPN on to reach it."*
- ✅ Good (tag as environment; it fails the north-star test):
  ```json
  {"id":"environment-setup-infra-7d21-1","principle":"staging database uses a stg_ table prefix and requires VPN access","layer":"environment","condition":"","why":"current infra detail; not transferable","theme":"environment setup","evidence":"staging DB is at the stg_ prefix … VPN on to reach it","example":"stg_ prefix; VPN","source_session":"infra__7d21","relations":[]}
  ```
  This never enters the Operating Model — it goes to the Environment Ledger (see
  `output-format.md`).

## Memory-sourced material
Some sources are not transcripts but the user's own saved memory and instruction files
(`CLAUDE.md`, `AGENTS.md`, `MEMORY.md`, `USER.md`, saved memories). Treat them as strong
CANDIDATES (the user authored or confirmed them, so give them a higher confidence prior) — but
**do not copy them verbatim.** Run them through the SAME pipeline:
- **Climb.** Memory is the most environment-laced source there is ("this project uses X", "the
  proxy is Y", tool setup). Extract the transferable principle; route project/tool specifics to
  `environment` like any other.
- **Gate.** Apply the north-star test. A saved memory enters the operating model ONLY if it
  would still help on a project the person has never touched.
- **Add, don't echo.** Keep memory that ADDS to the operating model (a principle not yet
  captured, or stronger evidence for one). Drop restated tooling/config.
- **Never re-ingest your own output.** Skip any section a profiling tool previously wrote (a
  generated operating profile) — re-eating it inbreeds the profile.

## Skip entirely
- Topic-specific content (the actual task or domain).
- Anything true of almost any developer.
- Secrets — drop the fact (see `harnesses.md` → "never emit a secret").
- **Eval / benchmark / automation runs** — repeated near-identical prompts carry no preference
  signal; skip the whole session.
- **Twin's own sessions** — any session that is itself a profile build / update / audit / query
  run (including the one you are in right now). Like the memory rule above: re-ingesting your
  own output inbreeds the profile.

## Output
When distilling a batch, return ONLY a JSON array of fact objects in the schema above — no
prose, no fences — and append each object as one line to `claims.jsonl`.

**Yield: a substantive session typically gives 1–5 facts, and zero is a valid outcome.** You
are panning for gold, not summarizing — emit only what survives the north-star test and the
skip list. Ten facts from one session almost always means the altitude is too low (you are
logging the session, not distilling the person). Recurrence ACROSS sessions is what makes a
principle strong; repeating it from within one session adds nothing.
