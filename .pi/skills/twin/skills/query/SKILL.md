---
name: query
description: "Answer questions from the user's twin operating-profile with cited evidence — 'how do I usually handle X?', 'what would I do here?', 'what does my profile say about reviews/testing/escalation?', 'ask my twin'. Also for OTHER agents or sessions that need the user's operating context mid-task ('pull my operating preferences for this kind of work'). Use even if the user doesn't say the word 'twin'. Read-only: never modifies the profile."
---

# Query the Profile

Answer a question about *how this user operates* from their distilled claims — grounded,
conditional, and cited. This is the mid-task context tap: a human asks "how do I usually handle
flaky tests?", or another agent pulls the user's operating preferences before acting. Read-only;
you never modify the profile here. No API key, **no code to run**.

**Precondition.** `<work-dir>/claims.jsonl` must exist (paths resolve as in `profile`); fall
back to the compiled Operating Model (work-dir `AGENTS.md`, or the installed
`twin:operating-model` block) if only that exists. If neither exists, say there is no profile
yet and offer the `profile` build.

## How to answer

1. **Retrieve from claims, not vibes.** Match the question against `principle`, `theme`, `why`,
   and `condition` across claims.jsonl. Prefer high-recurrence claims; carry the `(tentative)`
   caveat for one-offs. The compiled AGENTS.md is the summary — the claims are the source;
   answer from the source when you have it.
2. **Conditions are the answer's shape.** If matching claims differ by condition, do not
   average them — present the branch that fits the asker's situation, or both branches labeled
   by condition ("when experimenting … / when changing a production system …"). If the
   situation is ambiguous and the branches disagree, ask the one clarifying question that picks
   the branch.
3. **Cite or decline.** Every statement traces to a claim — give the principle, its *why*, and
   the recurrence (`seen in K sessions`); quote the evidence when the asker wants proof. If
   nothing in the claims answers the question, **say so plainly** and stop. Never improvise a
   plausible-sounding answer — an ungrounded answer here poisons the very trust the profile
   exists to build. Suggest `update` if the topic is likely in recent unprofiled sessions.
4. **Answer at operating altitude.** The asker wants the principle and when it applies, not a
   recap of old projects. Environment specifics (current repos/tools) come from the Environment
   Ledger and are answered as dated facts ("as of <date> …").

**Format:** lead with the direct answer in one or two sentences, then the supporting principles
as short cited bullets. For an agent-to-agent pull (the asker is a running task, not a chatting
human), return just the relevant principles with conditions and recurrence — compact, no prose.
