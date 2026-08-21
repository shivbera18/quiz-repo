---
name: audit
description: "Adversarially grade the user's twin operating-profile: verify every claim against its cited evidence, screen for horoscope/Barnum lines, find contradictions and over-generalizations, and re-score portability. Use whenever the user says 'audit my profile', 'is my profile accurate', 'grade my profile', 'check my AGENTS.md', 'does my profile actually sound like me', or doubts what twin produced — even if they don't say the word 'twin'."
---

# Profile Audit

Grade the existing profile the way a skeptical reviewer would — your job in this playbook is to
**refute** each line, not to admire it. A profile only earns trust if it survives an adversarial
read: every principle entailed by real evidence, nothing that would be true of anyone, no silent
contradictions. You (the harness) are the judge — no API key, **no code to run**.

**Precondition.** `<work-dir>/claims.jsonl` and `<work-dir>/AGENTS.md` must exist (paths resolve
as in `profile`). If not, offer the full `profile` build instead.

**Autonomy.** Run the whole audit without per-step permission and SHOW the scorecard. Apply
fixes only after the user picks which ones; never rewrite the profile or global config silently.

## Workflow

### 1. Load the rubric, then the profile
Read **`<plugin-root>/references/auditing.md`** — it defines the four checks, the verdict
schema, the scorecard template, and worked examples of each failure mode. Then load
`<work-dir>/claims.jsonl` and the compiled `AGENTS.md` (use the installed copy inside the
`twin:operating-model` markers if the work-dir copy is gone).

### 2. Run the four checks (the rubric is the contract)
1. **Faithfulness** — for each claim backing an Operating-Model line, re-open the source session
   and verify: the evidence quote exists, and the principle does not claim more than the
   evidence supports. Verdicts: `supported` / `overreach` / `unfounded`.
2. **Barnum screen** — for each Operating-Model line: would the OPPOSITE be implausible for
   anyone in this role? If yes, the line is a horoscope; flag it.
3. **Consistency scan** — find claim pairs that conflict without a distinguishing condition, and
   single-session claims stated as universal (missing `(tentative)`).
4. **Portability re-check** — re-run the self-eval from `references/output-format.md`
   (portability %, proper-noun leaks, counts).
Also report **coverage debt**: harnesses installed but unread, and sessions newer than
`last-run.txt` (point at the `update` skill for those).

### 3. Deliver the scorecard, then fix with consent
Render the scorecard exactly per the rubric's template — per-check scores, the flagged lines
with verdicts and one-line reasons, and an overall trust grade. Then offer the fixes the rubric
prescribes (re-climb an overreach, delete a Barnum line, split a contradiction into a
conditioned pair, demote unfounded claims) — apply only the ones the user picks, re-synthesize,
re-score, and offer to reinstall the corrected block.

## Quality bar
- Every Operating-Model line received a faithfulness verdict traced to a re-opened source — no
  line was waved through because it "sounds right".
- You defaulted to FLAGGING when uncertain (skeptic's default), and said plainly if the profile
  is mostly horoscope.
- The scorecard was shown before any fix; nothing was rewritten or installed without consent.
