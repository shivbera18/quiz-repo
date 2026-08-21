# Operating Model
<!-- twin:operating-model -->
_How I operate — distilled by twin from 7 sessions across 3 harnesses on 2026-08-21.
Portable: principles only, no project specifics. Regenerate with `/twin:profile`._

_Agent: these are my defaults — apply them without being asked. A line's condition decides
when it applies; when two lines pull opposite ways, the matching condition picks; if neither
condition clearly applies, ask me rather than averaging them._

## Git & delivery
- **Commit in small, granular units — one concern per commit** — keeps review easy, reverts surgical, and history readable. _(3 sessions)_
- **Land work on a branch, then a described pull request, merged through tooling** — the default branch stays shippable and every change has a reviewable unit. _(2 sessions)_
- **Revert bad pushed changes with a new forward commit, never by rewriting history** — history stays truthful for collaborators. _(tentative)_

## Quality bar & craft
- **Ship user-facing surfaces only at a polish bar: correct theming, no leftover boilerplate branding, nothing that reads unprofessional** — visible sloppiness reads as product immaturity. _(2 sessions)_
- **Cut a feature entirely when it can't meet the quality bar instead of shipping it half-working** — a broken half-feature costs more trust than its absence. _(tentative)_
- **Review generated text for tone, not just facts — revert phrasing that sounds off even when content is right** — anything representing me personally is judged by voice too. _(tentative)_

## Problem-solving approach
- **Find the root cause before accepting any fix** — symptom patches let the bug resurface elsewhere; one root-cause fix kills it everywhere. _(2 sessions)_
- **Ask for an explicit plan first, then separately approve implementation** — reviewing a plan is cheap; discovering a wrong direction after building is expensive. Applies to multi-step or risky work. _(2 sessions)_
- **Drive long improvement arcs through a living written checklist file, re-read and worked top-down** — an external list survives context resets and turns vague goals into discrete items. _(tentative)_

## Working style & tooling
- **Delegate parallelizable fixes to orchestrated subagents rather than one long serial run** — parallel execution cuts wall-clock time and isolates failures. _(tentative)_
- **Invest in tuning the agent harness itself — providers, models, language servers, plugins, skills — as first-class workspace setup** — a well-configured harness compounds across every later session. _(2 sessions)_
- **Prefer free tiers before paid infrastructure for personal projects** — experiments shouldn't carry cost; upgrade only when scale demands it. _(2 sessions)_
- **Capture significant decisions as committed design documents, not chat answers** — written docs outlive the session and teach future readers. _(tentative)_

## Learning & growth
- **Study systems by rebuilding them at depth — decompose, add queues/caches/event buses — rather than only reading** — implementation proves depth in a way reading can't. _(tentative)_
- **Optimize artifacts against measurable scores iteratively until the number moves** — a metric turns taste debates into converging feedback. _(tentative)_
<!-- /twin:operating-model -->
