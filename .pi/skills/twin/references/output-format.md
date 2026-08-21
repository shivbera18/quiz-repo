# Reference: output format — the exact deliverable, self-eval, and install routing

Read this when you SYNTHESIZE and DELIVER. It defines the two compiled files, the exact
templates to use, the portability self-eval you must run before shipping, and how the two
files install to different places. The structured source of truth stays in `claims.jsonl`;
these two files are the compiled, human- and harness-readable deliverable.

## Contents
- [Why two files, not one and not a directory](#why-two-files-not-one-and-not-a-directory)
- [Synthesis: claims.jsonl → the two files](#synthesis-claimsjsonl--the-two-files)
- [Deriving categories — fit the role](#deriving-categories--fit-the-role)
- [Template A — AGENTS.md (Operating Model, portable)](#template-a--agentsmd-operating-model-portable)
- [Template B — environment-ledger.md (dated, disposable)](#template-b--environment-ledgermd-dated-disposable)
- [Worked example](#worked-example)
- [Self-eval (gate before you ship)](#self-eval-gate-before-you-ship)
- [Install routing](#install-routing)

## Why two files, not one and not a directory
The two files are routed to **different places** (portable model → global config; dated ledger
→ per-project), so they are separate files. They are NOT a directory of per-category files: the
install targets (`AGENTS.md`, `~/.claude/CLAUDE.md`) are single-file rails that load with zero
config, and the Operating Model is deliberately short. Categories are **headings inside**
`AGENTS.md`, which gives the same organization without the import glue a directory would need.

## Synthesis: claims.jsonl → the two files
1. Load every fact from `claims.jsonl`.
2. Split by layer: `mental_model` + `operating_habit` → candidates for the **Operating Model**;
   `environment` → the **Environment Ledger**.
3. **Cluster** equivalent principles across sessions and harnesses; merge near-duplicates into
   one line. For each cluster, count the distinct **sessions** and **harnesses** it appears in —
   that recurrence is your confidence signal.
4. **Link pass** — you are the only step that sees the whole corpus, so the relations are drawn
   here (extraction leaves `relations` empty). For each pair of clustered principles, record an
   edge on the claims when one of three relations holds, and act on it:
   - **`conflicts_with`** — they prescribe opposite behavior. A conflict MUST resolve into a
     conditioned pair (find the distinguishing condition in the sources and render both lines
     with their conditions). A conflict you cannot condition is a defect: keep the
     better-evidenced claim, tag its line `(tentative)`, and report it in the self-eval.
   - **`refines`** — one is a sharper version of the other. Keep the sharper text, sum the
     recurrence, point the edge at the survivor.
   - **`depends_on`** — one presupposes the other (e.g. "requires a failing test first" depends
     on "reproduces before fixing"). Render the prerequisite first within its category.
   Write the edges back into `claims.jsonl` (`{"type": "...", "target": "<id>"}`) so `audit` and
   `query` can traverse them; the compiled file shows only the *resolved* result, never raw edges.
5. **Derive the category set** that fits THIS person from the clustered principles and their
   `theme` hints (see "Deriving categories" below). Do not reuse a fixed engineering list. Group
   the Operating-Model principles under it.
6. **Rank** within each category by recurrence (most-recurring first); order the categories
   themselves by total recurrence. Keep the Operating Model to **8–12 lines total** — the
   highest-signal principles, not everything.
7. Tag any principle seen in only one session `(tentative)`.
8. Preserve **conditions** as written — never flatten a context-dependent pair into one averaged
   rule.

## Deriving categories — fit the role
Categories are **derived once, over the whole corpus**, to fit who this person actually is — an
engineer, PM, designer, CX agent, salesperson, analyst, ops lead. They are headings for human
legibility; the consuming agent reads the principles regardless, so fitting the person's real
work costs nothing and makes the profile feel like *theirs*.

1. Look at what the clustered principles (and their `theme` hints) are actually ABOUT.
2. Name **as few categories as cleanly fit — usually 4–7** — each holding more than one
   principle. Title Case, in the person's own idiom.
3. Most categories should be **role-agnostic operating dimensions** (the palette). Add **1–3
   craft categories** the corpus reveals — the thing this person is expert at.

**Role-agnostic palette** (pick the ones that fit; rename to taste — these apply to anyone):
- **Proof & verification** — how they decide something is true, done, or safe to rely on.
- **Risk & caution** — what they guard against; when they slow down or refuse.
- **Scope & prioritization** — how they decide what's in/out and what matters most; tradeoffs.
- **Judgment & autonomy** — deciding alone vs. looping others in; calls under uncertainty.
- **Communication & reporting** — how they convey state and findings; what they surface; tone.
- **Stakeholders & relationships** — managing trust, alignment, and expectations with others.
- **Quality bar & craft** — what "good" looks like in their core output; what they reject.
- **Learning & iteration** — how they improve, handle feedback, run experiments.
- **Process & tooling** — the repeatable workflows and tools they lean on.

**Craft categories are derived — examples by role** (let the corpus pick, don't impose):
engineer → "Code & architecture", "Testing & release" · PM → "Discovery & specs", "Metrics &
success" · designer → "Design & UX craft" · CX → "Triage & escalation", "Resolution quality" ·
sales → "Qualification & pipeline", "Objection handling" · analyst → "Data & evidence".

**Guardrail (the lesson behind this rule):** an earlier version forced a category per fact and
exploded into 50+ ad-hoc buckets — unusable. Derive ONE small set over the whole corpus, cap it,
and make every category hold more than one principle. Never invent a category per fact.

## Template A — AGENTS.md (Operating Model, portable)
Use this exact structure. Include only categories that have content; order categories by total
recurrence (the category with the strongest/most facts first). Zero proper nouns anywhere in
this file.

```markdown
# Operating Model
<!-- twin:operating-model -->
_How I operate — distilled by twin from <N> sessions across <M> harnesses on <YYYY-MM-DD>.
Portable: principles only, no project specifics. Regenerate with `/twin:profile`._

_Agent: these are my defaults — apply them without being asked. A line's condition decides
when it applies; when two lines pull opposite ways, the matching condition picks; if neither
condition clearly applies, ask me rather than averaging them._

## <Category in Title Case>
- **<principle, one sentence, no proper nouns>** — <why it matters / what it optimizes for>. _(<K> sessions)_
- **<principle>** — <why>. Applies <condition>. _(tentative)_

## <Next category>
- ...
<!-- /twin:operating-model -->
```
Per-line rules:
- Lead with the **principle** in bold, then the **why** (the mental model), then any
  **condition** clause, then a recurrence tag.
- Recurrence tag: `_(K sessions)_`, or `_(tentative)_` for a one-off.
- Every line must pass the north-star test (see `distillation.md`): true and useful on a
  project the person has never touched.

The `_Agent:_` preamble is part of the template — it is what turns the file from a
*description of* the user into an *instruction to* the agent reading it. Keep it.

## Template B — environment-ledger.md (dated, disposable)
```markdown
# Environment Ledger
_Context as of <YYYY-MM-DD> — verify before relying. Disposable specifics, NOT how I think._

## <Section named from the facts>
- <environment-layer fact>
```
Section names are **derived from the facts**, like categories — don't impose an engineering
frame. An engineer's ledger might say "Repos & branches / Tools & services / Data & tables"; a
PM's "Products & launches / Tools & systems / Key docs"; a salesperson's "Accounts & territory
/ CRM & tooling / Active deals". Include only sections that have content. Everything here is
quarantined out of the Operating Model.

## Worked example
A small but realistic Operating Model (abbreviated):
```markdown
# Operating Model
<!-- twin:operating-model -->
_How I operate — distilled by twin from 22 sessions across 3 harnesses on 2026-06-10._

## Proof and verification
- **States sample size and coverage before quoting a ranking, and refuses a top-N the data can't support** — guards against confident conclusions from thin or skewed samples. Applies when presenting an aggregate from queried data. _(6 sessions)_
- **Reproduces a bug from a failing test before fixing it** — a fix without a red-then-green test is unverified. _(4 sessions)_

## Risk and safety
- **Defers automated tests when the work is a throwaway spike, but requires green CI before calling work done on an existing system** — matches rigor to blast radius. _(5 sessions)_

## Workflow and tooling
- **Branches off the team's integration branch and never assumes the default branch is the base** — keeps unshipped work off the branch that deploys. _(3 sessions)_
<!-- /twin:operating-model -->
```

And the same person's profile if they were in **sales, not engineering** — note the categories
are completely different because they were derived from *their* corpus, not imposed:
```markdown
# Operating Model
<!-- twin:operating-model -->
_How I operate — distilled by twin from 18 sessions across 2 harnesses on 2026-06-10._

## Qualification & pipeline
- **Confirms budget, authority, and a real timeline before forecasting a deal as committed** — keeps the pipeline honest so the forecast actually means something. _(5 sessions)_

## Objection handling
- **Surfaces the unspoken objection before answering the literal question** — the stated concern is rarely the real one. _(4 sessions)_

## Communication & reporting
- **Opens a status update with the decision the reader must make, then the supporting detail** — respects their time and forces clarity. _(6 sessions)_
<!-- /twin:operating-model -->
```

## Self-eval (gate before you ship)
Compute and SHOW the user these before offering to install. Do not silently ship a profile
that is mostly environment trivia.
- **Portability %** = (Operating-Model lines that pass the north-star test AND contain zero
  proper nouns) ÷ (total Operating-Model lines). Report the number.
- **Proper-noun leaks** = list every Operating-Model line that still names a repo / branch /
  file / tool / tenant / table / env-var. For each: climb it (rewrite without the noun) or move
  it to the Environment Ledger. Re-compute after fixing.
- **Horoscope spot-check** = for each Operating-Model line, ask: *would the opposite be
  implausible for anyone in this role?* If yes, the line is Barnum filler — sharpen it from the
  concrete claims in its cluster or cut it (the full rubric lives in `auditing.md`; this is the
  ship-time version so day one is never a horoscope).
- **Counts** = sessions read, harnesses covered, facts distilled, lines in the Operating Model,
  lines in the Ledger.
- If portability is low (a large share is environment), **say so loudly and fix it** before
  delivering.

## Install routing
Show the user both files and the self-eval, then offer to install with consent — show exactly
what you'll write first.
- **AGENTS.md (Operating Model) → GLOBAL.** It is portable, so it belongs everywhere:
  `~/.claude/CLAUDE.md` (Claude Code) or `~/.codex/AGENTS.md` (codex). Wrap it in the
  `<!-- twin:operating-model -->` … `<!-- /twin:operating-model -->` markers so a re-run
  **replaces** the block in place instead of appending a duplicate.
- **environment-ledger.md → PER-PROJECT.** Write it to the current project's `AGENTS.md` /
  `CLAUDE.md`, or leave it in the work-dir. Never put environment trivia into global config.
- Deleting the work-dir removes everything; re-run `/twin:profile` to refresh.
