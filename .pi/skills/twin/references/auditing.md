# Reference: audit rubric — how to grade a profile adversarially

Read this when AUDITING an existing profile. Your stance throughout is **skeptic**: try to
refute each line; when uncertain, flag. The four checks below are ordered by how badly their
failure poisons trust. Each check defines its verdicts, and the scorecard at the bottom is the
exact deliverable.

## Contents
- [Check 1 — Faithfulness (claim vs. evidence)](#check-1--faithfulness-claim-vs-evidence)
- [Check 2 — Barnum screen (the horoscope test)](#check-2--barnum-screen-the-horoscope-test)
- [Check 3 — Consistency scan](#check-3--consistency-scan)
- [Check 4 — Portability re-check](#check-4--portability-re-check)
- [Coverage debt](#coverage-debt)
- [Scorecard template](#scorecard-template)
- [Prescribed fixes](#prescribed-fixes)

## Check 1 — Faithfulness (claim vs. evidence)
For every claim that backs an Operating-Model line, re-open its `source_session` and judge the
entailment between the evidence and the principle. Three verdicts:
- **`supported`** — the quote exists in the source, and a reasonable reader would infer the
  principle from it (the principle may generalize, but does not add commitments the evidence
  can't carry).
- **`overreach`** — the quote exists, but the principle claims MORE than it supports: a stronger
  modal ("always", "never", "refuses"), a wider scope, or a motive the user never stated.
- **`unfounded`** — the quote is not in the source (or not said by the user), or the principle
  bears no real relation to it.

Worked example — the same evidence, three principles:
> Evidence: *"run the tests before you push that"* (one session)
- `supported`: "runs the test suite before pushing changes" — direct generalization.
- `overreach`: "never ships any change without full regression coverage" — stronger modal +
  wider scope than one remark supports.
- `unfounded`: "distrusts CI infrastructure" — a motive invented, not evidenced.

If claims.jsonl is large, audit every claim behind the Operating Model (those are few by
design) and sample the rest. Never skip a line because re-opening the source is tedious — the
tedium is the audit.

## Check 2 — Barnum screen (the horoscope test)
A Barnum line is one that reads as personal but is true of nearly everyone — "values clear
communication", "cares about code quality", "wants to ship fast without breaking things". The
test, applied to each Operating-Model line:
> **Would the opposite be implausible for anyone in this role?**
If yes — nobody would claim the opposite — the line carries zero distinguishing information.
Flag it `barnum`. A useful contrast:
- ❌ Barnum: "verifies work before calling it done" (who wouldn't?)
- ✅ Specific: "reproduces a bug with a failing test before fixing it, and treats a fix without
  red-then-green as unverified" — the opposite (fix first, trust the diff) is a real and common
  way to operate, so this line distinguishes.
The fix for a Barnum line is usually not deletion but **sharpening**: go back to the claims in
its cluster and find what the user *concretely does* that the generic line was averaging away.

## Check 3 — Consistency scan
Two failure shapes:
- **Unconditioned conflict** — two claims prescribe opposite behavior with no distinguishing
  `condition` (e.g. "skips tests" and "requires green CI", both unconditional). Per the
  distillation contract this should never have survived synthesis; flag the pair. Fix: find the
  real distinguishing condition in the sources and split, or drop the weaker claim.
- **Over-generalized one-off** — a single-session claim rendered without `(tentative)`, or a
  condition so broad it never gates ("when working on software"). Flag; fix by re-tagging or
  tightening the condition.

## Check 4 — Portability re-check
Re-run the self-eval from `output-format.md` against the CURRENT Operating Model (the installed
copy may have drifted from the work-dir copy — audit what the user's agents actually load):
portability %, proper-noun leak list, line/category counts. Report drift between installed and
work-dir copies if both exist.

## Coverage debt
Trust also fails by omission. Report, without fixing here:
- Harnesses present on the machine (per `harnesses.md` globs) with zero sessions read.
- Sessions newer than `last-run.txt` → recommend the `update` skill.
- Any layer imbalance (e.g. zero `mental_model` claims — the asset — means the distillation ran
  shallow).

## Scorecard template
Deliver exactly this shape (fill all counts; omit a flagged-lines table only if it is empty):

```markdown
# Profile Audit — <YYYY-MM-DD>

| Check        | Result |
|--------------|--------|
| Faithfulness | <S> supported / <O> overreach / <U> unfounded (of <N> audited) |
| Barnum       | <B> horoscope lines of <L> |
| Consistency  | <C> unconditioned conflicts · <G> over-generalized one-offs |
| Portability  | <P>% · <K> proper-noun leaks |
| Coverage     | <sessions unread / harnesses uncovered / stamp age> |

**Trust grade: <A–F>** — <one sentence: the dominant problem, or "survives adversarial read">.

## Flagged lines
| Line (abbrev.) | Verdict | Why (one line) | Prescribed fix |
|---|---|---|---|
```

Trust grade anchors: **A** = all four checks clean. **B** = minor overreach/Barnum, core
faithful. **C** = several lines fail but the model is salvageable by the prescribed fixes.
**D/F** = the model is substantially horoscope or unfounded — recommend a rebuild over repairs.

## Prescribed fixes
Offer these (apply only what the user picks, then re-synthesize and re-score):
- `overreach` → re-climb: weaken the modal / narrow the scope to what the evidence carries.
- `unfounded` → delete the claim from claims.jsonl (the compiled line falls out on re-synthesis).
- `barnum` → sharpen from the cluster's concrete claims, or delete if nothing concrete exists.
- conflict → split into a conditioned pair using the sources; one-off → tag `(tentative)`.
- leaks → climb or demote to the Environment Ledger, exactly as in `output-format.md`.
