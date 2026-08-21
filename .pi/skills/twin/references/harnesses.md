# Reference: harness registry — where lived agent data lives, and how to read it

Read this when you need to **find and read** a user's sessions or memory. It is the map: per
harness, where files live, the exact JSONL shape (with a real sample line), where memory lives,
the noise to ignore, the secrets to redact, and the substance gate. There is no harvester
script — you are the runtime. Use Glob to find files, Read to open them, and the shell
one-liner at the bottom for cheap triage. Everything is local; nothing leaves the machine.

## Contents
- [How a transcript is shaped](#how-a-transcript-is-shaped)
- [Claude Code](#claude-code)
- [codex](#codex)
- [hermes (or any personal agent)](#hermes-or-any-personal-agent)
- [Gemini CLI](#gemini-cli)
- [Aider](#aider)
- [Cursor](#cursor)
- [oh-my-pi (pi)](#oh-my-pi-pi)
- [GitHub Copilot](#github-copilot)
- [Windsurf (memory only)](#windsurf-memory-only)
- [Probe-first protocol](#probe-first-protocol)
- [Bring your own harness (HITL)](#bring-your-own-harness-hitl)
- [Memory files (all harnesses)](#memory-files-all-harnesses)
- [What to ignore + never emit](#what-to-ignore--never-emit)
- [The substance gate](#the-substance-gate)
- [Triage one-liner](#triage-one-liner)

`~` is the home dir (`/Users/<you>` on macOS, `/home/<you>` on Linux, `C:\Users\<you>` on
Windows). `~/.claude` and `~/.codex` live in the home dir on **every** platform; only the
personal-agent app-data dir is OS-specific. Glob first — paths that don't exist are skipped;
never assume a harness is installed.

The globs, samples, and one-liners below are the **cheap path, not a cage** — if you can find
the same data a better way, do. What is binding everywhere are the three **contracts**:
**read-only** (never write to a harness's files or databases), the **substance gate**, and the
**redaction rules**. Everything else is advice to save you time.

---

## How a transcript is shaped
Most harnesses store a session as **JSONL** — one JSON object per line, one line per event.
Most lines are noise (tool calls, tool results, reasoning, meta events). You want only the
lines that are a **user or assistant message**, and from each you want the **plain text**. The
three things that differ per harness are: (1) the glob, (2) which field holds the role, and
(3) which field holds the content. Everything below is just those three things plus a sample.

A few harnesses use other containers — a JSON array (Gemini CLI, VS Code Copilot Chat),
markdown (Aider), or SQLite (Cursor, opencode). The job is identical: find the user/assistant
turns, extract the plain text. For SQLite you need the `sqlite3` CLI (check
`sqlite3 --version`; if absent, skip that harness and say so) — and **never open a live
harness database read-write**: open read-only (`sqlite3 "file:<path>?mode=ro"`) or copy the
file into the work-dir and read the copy.

`content` is either a plain string OR an array of blocks. Extract text by concatenating the
`.text` of every block that has one. Blocks with no `.text` field — tool calls, tool results,
thinking, images — carry no operating signal: drop them.

---

## Claude Code
- **sessions glob:** `~/.claude/projects/<project-slug>/<session-uuid>.jsonl`
- **role field:** `.type` (a turn when it is `"user"` or `"assistant"`)
- **content field:** `.message.content`
- **skip a line if:** `.isMeta` is true or `.isSidechain` is true (sub-agent / injected plumbing)
- **handy metadata on turn lines:** `.cwd`, `.gitBranch`, `.timestamp`

Sample user line (newlines added for readability — real lines are single-line):
```json
{"type":"user","isMeta":false,"isSidechain":false,
 "cwd":"/Users/you/projects/api","gitBranch":"feat/login","timestamp":"2026-05-01T10:00:00Z",
 "message":{"role":"user","content":"refactor the auth middleware to use the new token format"}}
```
Sample assistant line with blocks — keep the `text` block, drop the `tool_use` block:
```json
{"type":"assistant","timestamp":"2026-05-01T10:00:05Z",
 "message":{"role":"assistant","content":[
   {"type":"text","text":"I'll update the middleware, then run the auth tests before touching anything else."},
   {"type":"tool_use","name":"Edit","input":{"file_path":"src/auth.ts"}}]}}
```
→ Parsed: `user: "refactor the auth middleware…"` then
`assistant: "I'll update the middleware, then run the auth tests…"`.

## oh-my-pi (pi)
- **sessions glob:** `~/.omp/agent/sessions/<project-slug>/<timestamp>_<uuid>.jsonl`
  (`<project-slug>` is the cwd flattened with dashes, e.g. `-desktop-quiz-repo`; sibling
  extensionless directories hold session artifacts — read only the `.jsonl` files).
- **role field:** `.message.role` on lines where `.type == "message"` (a turn when it is
  `"user"` or `"assistant"`)
- **content field:** `.message.content` (array of blocks; keep `.text`, drop tool calls/results)
- **skip a line if:** `.type` is anything other than `"message"` (titles, model changes,
  thinking-level changes, tool events)
- **handy metadata on turn lines:** `.timestamp`, and the parent directory name gives the project

Sample user line:
```json
{"type":"message","id":"56e1434d","parentId":"6183f1a8","timestamp":"2026-08-20T14:12:48.181Z",
 "message":{"role":"user","content":[{"type":"text","text":"hii"}],"attribution":"user"}}
```
Sample assistant line:
```json
{"type":"message","id":"68f4d36f","parentId":"56e1434d",
 "message":{"role":"assistant","content":[{"type":"text","text":"Hi. What are we doing?"}]}}
```

## codex
- **sessions glob:** `~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl`
- **role field:** `.payload.role` (a turn when it is `"user"` or `"assistant"`)
- **content field:** `.payload.content`
- **skip a line if:** it has no `.payload.role` (most lines — reasoning, events, meta)

Sample (codex wraps the message in `.payload`; text blocks are `input_text` / `output_text`):
```json
{"timestamp":"2026-05-02T14:20:00Z",
 "payload":{"role":"user","content":[{"type":"input_text","text":"run the test suite and fix the failures, then summarize what broke"}]}}
```
A non-message line you will see often and must skip (no `payload.role`):
```json
{"payload":{"type":"reasoning","content":[{"type":"text","text":"The user wants…"}]}}
```

## hermes (or any personal agent)
Personal agents store data in the OS app-data dir, which differs by platform. Glob the app
root for your OS, then `sessions/*.jsonl` under it.
- **app root — macOS:** `~/Library/Application Support/hermes/` (also try `~/.hermes/`)
- **app root — Linux:** `~/.local/share/hermes/` or `~/.config/hermes/` (also try `~/.hermes/`)
- **app root — Windows:** `~/AppData/Local/hermes/` (`%LOCALAPPDATA%/hermes`)
- **sessions glob:** `<app-root>/sessions/*.jsonl`
- **role field:** `.role` · **content field:** `.content` (both top-level)

Sample:
```json
{"role":"user","content":"summarize today's PRs and flag anything risky before I merge","timestamp":"2026-05-03T09:00:00Z"}
```

## Gemini CLI
Stores per-project data under `~/.gemini/tmp/<project-hash>/` (the hash is opaque — glob it).
- **saved sessions:** `~/.gemini/tmp/*/chats/*` and `~/.gemini/tmp/*/checkpoint-*.json` —
  JSON with a `history` array of Content objects: **role field** `.role` (`"user"` /
  `"model"` — note `model`, not `assistant`), **content** under `.parts[].text`.
- **prompt log:** `~/.gemini/tmp/*/logs.json` — a JSON array of the user's prompts only
  (`.type == "user"`, text in `.message`). User-side signal only; still useful.

Sample history entry:
```json
{"role":"user","parts":[{"text":"add retry with backoff to the fetch layer, but don't touch the cache"}]}
```

## Aider
No app-data dir — Aider writes transcripts **into the repo it ran in**, as **markdown**:
- **sessions:** `.aider.chat.history.md` in each repo root (one file, many sessions). Find them
  by globbing the user's project roots (e.g. `~/projects/*/.aider.chat.history.md`); if you
  don't know where their repos live, ask.
- **format:** sessions are delimited by `# aider chat started at <timestamp>` headings; **user
  turns are the lines prefixed `#### `**; assistant output is the unprefixed markdown between
  them. Treat each `# aider chat started` block as one session for the substance gate.

## Cursor
Chat lives in **SQLite**, not files (use the read-only protocol above; skip if no `sqlite3`).
- **db — macOS:** `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` ·
  **Linux:** `~/.config/Cursor/User/globalStorage/state.vscdb` ·
  **Windows:** `~/AppData/Roaming/Cursor/User/globalStorage/state.vscdb`
- **where:** table `cursorDiskKV`; each message is one row keyed `bubbleId:<composerId>:<bubbleId>`
  whose value is JSON: **role field** `.type` (`1` = user, `2` = assistant), **content field**
  `.text`. Session metadata rows are keyed `composerData:<composerId>`.
- **extract:** `sqlite3 "file:<db>?mode=ro" "SELECT value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'"`,
  then parse each row's JSON. Group by the composerId inside the key; one composer = one session.
- Newer Cursor builds also write `~/.cursor/chats/**/store.db` and per-project agent
  transcripts under `~/.cursor/projects/*/agent-transcripts/*.jsonl` — their schemas vary by
  version, so use the probe-first protocol on those.

## opencode
Data dir is `~/.local/share/opencode` on **every** OS (yes, literally that path on Windows too).
The format changed across versions — probe both:
- **current (SQLite):** `~/.local/share/opencode/opencode.db` (some builds: `opencode-prod.db`).
  Tables include `session`, `message`, `part`; rows hold JSON — role is on the message, text in
  parts with `"type":"text"`. Apply the probe-first protocol to the exact columns.
- **legacy (flat JSON, may coexist):** `~/.local/share/opencode/storage/message/<sessionID>/*.json`
  (has `.role`) paired with `storage/part/<messageID>/*.json` (has `.type` / `.text`). One
  `<sessionID>` directory = one session.

## GitHub Copilot
Two distinct surfaces:
- **Copilot CLI:** `~/.copilot/session-state/<session-id>/events.jsonl` — JSONL event stream of
  prompts, responses, and tool calls. Field names vary by version: probe-first, then extract
  the user/assistant text events.
- **Copilot Chat (VS Code):** `<vscode-user-dir>/workspaceStorage/*/chatSessions/*.json` where
  `<vscode-user-dir>` is `~/Library/Application Support/Code/User` (macOS) ·
  `~/.config/Code/User` (Linux) · `~/AppData/Roaming/Code/User` (Windows). JSON with a
  `requests` array: **user text** at `.requests[n].message.text`, **assistant text** in
  `.requests[n].response[].value`. One file = one session.

Sample (Copilot Chat, abbreviated):
```json
{"version":3,"requests":[{"message":{"text":"why is this query slow on the orders table"},"response":[{"value":"The join is unindexed…"}]}]}
```

## Windsurf (memory only)
Windsurf's Cascade transcripts (`~/.codeium/windsurf/cascade/`) are an **undocumented binary
format — do not parse them**; route through HITL if the user wants them in. But its memory
files are plain markdown and well worth reading:
- `~/.codeium/windsurf/memories/global_rules.md` and the rest of `~/.codeium/windsurf/memories/`
- per-project `.windsurf/rules/*.md` and legacy `.windsurfrules`

## Probe-first protocol
Some sources above have a stable LOCATION but a version-dependent SCHEMA. You are a language
model reading the file anyway — so probe: open ONE session (or query one row), look at it, and
identify which field carries the role and which carries the text. If the two fields are obvious
from a sample, proceed across the harness with what you found; if they are not, skip the
harness and tell the user what you saw. **Never guess silently and never write to a harness's
own files or databases.** A wrong path skipped costs nothing; a misread schema fabricates a
profile.

## Bring your own harness (HITL)
If the user runs a harness not listed here (Cline, Roo, Zed, PI, a company-internal agent, …),
you only need the same three things to read it — ask for them, then treat it identically:
1. the **sessions glob** (where its JSONL/transcripts live),
2. the **role field** (where each line says who spoke — e.g. `role`, `type`, `payload.role`), and
3. the **content field** (where the message text lives — e.g. `content`, `message.content`).
Most coding-agent harnesses are line-delimited JSON with a role + content shape; once you know
those fields you can read it with no new code.

---

## Memory files (all harnesses)
Beyond transcripts, harnesses store the user's **own saved instructions and memories**. These
are strong candidates for the operating model — the user authored or confirmed them — but are
**never copied verbatim**; run them through the same climb/gate as a transcript (see
`distillation.md` → "Memory-sourced material"). Read these if present:
- **Claude Code:** `~/.claude/CLAUDE.md` (global instructions) ·
  `~/.claude/projects/<slug>/memory/*.md` and that folder's `MEMORY.md` index (auto-memory)
- **codex:** `~/.codex/AGENTS.md` (global) · any `~/.codex/**/AGENTS.md` · `~/.codex/**/memories/*`
- **hermes / personal agent:** `<app-root>/**/MEMORY.md` · `<app-root>/**/USER.md`
- **Gemini CLI:** `~/.gemini/GEMINI.md` (global; `/memory add` appends under "Gemini Added
  Memories") · per-project `GEMINI.md`
- **Cursor:** per-project `.cursor/rules/*.mdc` · legacy `.cursorrules`
- **Windsurf:** `~/.codeium/windsurf/memories/**` · per-project `.windsurf/rules/*.md` · legacy `.windsurfrules`
- **opencode:** `~/.config/opencode/AGENTS.md` (global) · per-project `AGENTS.md`
- **Copilot:** per-repo `.github/copilot-instructions.md` · `.github/instructions/*.instructions.md`

A fact that appears in BOTH memory and lived transcripts is the strongest signal there is:
authored intent confirmed by behavior. Rank it highest.

---

## What to ignore + never emit
**Ignore this noise** on a **user** turn — it is injected by the harness, not written by the
user. Strip these wrapper blocks and everything inside them:
- `<system-reminder>…</system-reminder>`
- `<command-message>…</command-message>`, `<command-name>…</command-name>`, `<command-args>…</command-args>`
- `<local-command-…>…</local-command-…>`
- `<environment_context>…</environment_context>` (codex) · `<user_instructions>…</user_instructions>` (codex)

**Never emit a secret.** If a value looks like a credential, treat it as `[REDACTED]` — never
copy it into a fact's evidence or example, and **drop any fact whose evidence would contain
one.** Shapes to catch:
- `sk-…`, `ghp_…`, `AKIA…` (OpenAI / GitHub / AWS keys)
- `api_key=…`, `secret=…`, `token=…`, `bearer …`, `access=…` (the word, then a value)
- JWTs: `eyJ….….…` (three dot-separated base64url segments)

---

## The substance gate
Keep a session only if BOTH hold:
1. **More than 7 user messages.** Count the USER's turns, not the total — the user's turns are
   where the operating signal lives, and assistant verbosity says nothing about the person.
   Short one-shots carry none.
2. **Not an eval / benchmark / automation run.** If the user turns are the same prompt repeated
   (≈4+ identical, or under half of them unique), it is a loop with no preference signal — skip
   the whole session.

You do not need to fully read every file to apply gate #1. **Triage cheaply first** with a line
count (a JSONL line ≈ one event; 8+ user turns with replies means ≥ ~15 lines, so the count is
a generous pre-filter for discarding the obviously-tiny files), then confirm the real user-turn
count and the eval check while reading the survivors during distillation.

## Triage one-liner
Run the one for your shell to list every candidate **file-based** session with its line count,
biggest first. Take the files comfortably above ~15 lines as your worklist. (Line counts only
pre-filter line-oriented files; for JSON-array sessions — Gemini, Copilot Chat — and SQLite
harnesses — Cursor, opencode — use file size as the cheap filter and apply the real gate while
reading.)

```bash
# macOS / Linux (bash / zsh). nullglob so missing harnesses expand to nothing.
shopt -s nullglob 2>/dev/null || setopt NULL_GLOB 2>/dev/null
for f in ~/.claude/projects/*/*.jsonl \
         ~/.codex/sessions/*/*/*/rollout-*.jsonl \
         ~/.omp/agent/sessions/*/*.jsonl \
         ~/Library/Application\ Support/hermes/sessions/*.jsonl \
         ~/.local/share/hermes/sessions/*.jsonl \
         ~/.hermes/sessions/*.jsonl \
         ~/.copilot/session-state/*/events.jsonl; do
  [ -f "$f" ] && printf '%6s  %s\n' "$(wc -l < "$f")" "$f"
done | sort -rn
# Non-line-oriented candidates (size, not lines):
ls -lS ~/.gemini/tmp/*/chats/* ~/.gemini/tmp/*/checkpoint-*.json \
       ~/Library/Application\ Support/Code/User/workspaceStorage/*/chatSessions/*.json \
       ~/.config/Code/User/workspaceStorage/*/chatSessions/*.json 2>/dev/null
```

```powershell
# Windows (PowerShell)
$globs = @(
  "$HOME\.claude\projects\*\*.jsonl",
  "$HOME\.codex\sessions\*\*\*\rollout-*.jsonl",
  "$HOME\.omp\agent\sessions\*\*.jsonl",
  "$HOME\AppData\Local\hermes\sessions\*.jsonl",
  "$HOME\.copilot\session-state\*\events.jsonl"
)
Get-ChildItem $globs -ErrorAction SilentlyContinue |
  ForEach-Object { [pscustomobject]@{ Lines = (Get-Content $_.FullName | Measure-Object -Line).Lines; Path = $_.FullName } } |
  Sort-Object Lines -Descending | Format-Table -AutoSize
# Non-line-oriented candidates (size, not lines):
Get-ChildItem "$HOME\.gemini\tmp\*\chats\*", "$HOME\.gemini\tmp\*\checkpoint-*.json", `
  "$HOME\AppData\Roaming\Code\User\workspaceStorage\*\chatSessions\*.json" -ErrorAction SilentlyContinue |
  Sort-Object Length -Descending | Select-Object Length, FullName
```
