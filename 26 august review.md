# Quiz Platform — Full Code & Product Review (26 August 2026)

Scope: entire monorepo (`apps/web`, `apps/gateway`, `apps/identity`, `apps/catalog`, `apps/assessment`, `apps/analytics`, `apps/notification`, `packages/*`, `infra/`, CI, docs). Every finding below was verified against source with file:line references. Severity: **Critical / High / Medium / Low**.

---

## 1. Executive summary

The architecture is genuinely strong for a project of this size: clean service ownership (schema-per-service + roles), transactional outboxes, server-authoritative scoring from immutable snapshots, answer-key isolation, single-egress gateway with header scrubbing, and an unusually honest self-documenting known-gaps culture (`ARCHITECTURE-CURRENT.md` §20). The bones are excellent.

However, the review found **several issues more severe than the documented ones**, including one full authentication bypass, two unauthenticated AI-spend endpoints in the web app, a systemic outbox bug affecting all four services, answer-key leakage through two separate paths, and a deploy pipeline whose documented safety properties do not exist. The test pyramid is inverted — the most intricate logic (attempt lifecycle, gateway auth, rollups) has zero tests while scoring has 26 good golden fixtures.

**Top 10 actions, in order:**

1. Fix token validation (forgeable today) — see §2.1.
2. Hash passwords (argon2/bcrypt) behind a deliberate dual-read migration.
3. Remove/gate seeded admin credentials and pinned IDs; rotate the committed VAPID pair and all env secrets.
4. Route `/api/ai/generate-questions` and `/api/generate-flashcards` through the gateway with auth + caps.
5. Admin-gate `/v1/ai/quiz-generations` and strip answers from job polling responses.
6. Admin-gate `/v1/analytics/quizzes/:id` (p-value + optionCounts are an answer oracle).
7. Fix the outbox `markPublished` transaction escape (§3.1) and the autosave status races (§5.1–5.2).
8. Add CSV formula-injection escaping to the export pipeline.
9. Make deploys gated on CI, run migrations before traffic, stop discarding failures, add concurrency control + rollback story.
10. Stand up one true end-to-end test path (web → gateway → service) in CI.

---

## 2. Critical findings

### 2.1 Tokens are forgeable from a user id alone (auth bypass)
- **Where:** `apps/identity/src/index.ts:13-34` (`mintToken`, `parseToken`), introspect at `:175-186`.
- Token format `<userId>-<timestamp>-<random>` — but `parseToken` validates only that the timestamp parses and is < 30 days old. **The random suffix is never checked against any store.** Any string `<knownUserId>-<freshTimestamp>-<anything>` introspects as valid. The seed pins admin's ID to `admin-001` (`apps/identity/prisma/seed.ts:14`) and UUIDs leak via `/v1/users/:id`, leaderboards, and events → trivial privilege escalation on any deployed instance.
- Also uses non-cryptographic `Math.random()` for minting.
- **Fix:** store tokens server-side (hashed opaque token or signed token with revocation list); validate the secret segment; stop pinning IDs.

### 2.2 Passwords stored and compared as plaintext
- **Where:** storage `apps/identity/src/index.ts:141-149`; compare `if (user.password !== password)` at `:94-100` (non-constant-time); schema `password String` (`prisma/schema.prisma:33`).
- Documented as intentional deferral, but combined with §2.1 this is a complete account-takeover chain. Needs the planned deliberate migration: hash at rest, dual-read/upgrade on login, constant-time compare.

### 2.3 Known default credentials, deterministic IDs, reseeded on deploy
- **Where:** `apps/identity/prisma/seed.ts:10-53`.
- `admin@quizapp.com / admin123` (admin) and `student@test.com / student123` with fixed IDs `admin-001`/`student-001`. Anyone who reads the public repo owns the admin panel of any instance where seed ran. Seed also runs during EC2 deploys.
- **Fix:** refuse insecure seeds without an explicit env flag; randomize passwords; never reuse fixed IDs outside local dev.

### 2.4 Unauthenticated, unrate-limited Gemini spend via web routes
- **Where:** `apps/web/app/api/ai/generate-questions/route.ts:7-57` and `apps/web/app/api/generate-flashcards/route.ts:3-28`.
- Both POST handlers call Gemini directly, ignore the Authorization header entirely, bypass gateway rate limiting/tracing, accept an uncapped `count`, and flashcards puts the API key into the URL query string (`?key=...`, leaks to logs/proxies).
- **Fix:** move behind catalog-svc jobs (the async pattern already exists), require auth, cap counts, keep the key out of URLs.

### 2.5 Answer keys leak through the AI job API
- **Where:** `POST /v1/ai/quiz-generations` requires only *any* login — no admin check (`apps/catalog/src/index.ts:598-607`); succeeded generations go live immediately (`isActive: true`, `ai-worker.ts:120`). Worse, `GET /v1/ai/quiz-generations/:jobId` has **no ownership or role check** (`index.ts:645-653`) and returns raw job data including `partialQuestions` with `correctAnswer`/`explanation`. Any logged-in student who obtains a jobId reads answer keys; students can mint public quizzes with zero review.
- **Fix:** admin-gate creation (or force drafts inactive pending review), enforce requester-or-admin on poll, strip answers from all job responses.

### 2.6 Per-question statistics are an answer-key oracle
- **Where:** `GET /v1/analytics/quizzes/:id` and `/v1/analytics/quizzes` have no admin gate (`apps/analytics/src/index.ts:89-94, 178-214`).
- They return `pValue` and per-option `optionCounts` per question — any authenticated student can query which option everyone picks (usually the key) before attempting.
- **Fix:** `requireAdmin`; if students need stats, expose aggregates only.

### 2.7 Outbox publisher self-deadlocks every batch (all four services)
- **Where:** `packages/kafka-kit/src/outbox.ts:52` calls `store.markPublished(...)` inside the open claim transaction, but every implementation (`apps/{catalog,identity,assessment,notification}/src/outbox-store.ts`) marks via the **global Prisma client**, not the transaction handle.
- The interactive tx holds `FOR UPDATE` row locks; the pool connection's UPDATE blocks on them → circular wait until Prisma kills the tx (~5s default; assessment raises to 15s). Kafka send happens first so correctness survives by accident, but every batch pays a guaranteed timeout stall plus rollback error logs, and the documented atomicity invariant does not hold.
- **Fix:** pass the transaction handle through to marking (change the `OutboxStore` contract).

### 2.8 CSV formula injection in exports
- **Where:** `apps/analytics/src/csv.ts:1-9` escapes quotes per RFC 4180 but not leading `=`/`+`/`-`/`@`. User-controlled names flow from attempt events into `quiz-results` and `user-performance` CSVs; an admin opening one in Excel executes formulas from a malicious username.
- **Fix:** neutralize dangerous prefixes before quoting (this was a stated design goal — the shared utility exists but misses it).

### 2.9 Deploy pipeline safety is fiction
- **Where:** `.github/workflows/deploy-ec2.yml`.
  - Deploys trigger on plain push to `main` with **no CI gating** (no `workflow_run`/`needs`) — DEPLOYMENT.md claims otherwise; failing commits reach prod.
  - Migrations run **after** `up -d` starts new containers, each with `|| true` — failed migrations leave new code serving against old schema silently (`deploy-ec2.yml:111-138`).
  - No `concurrency:` control anywhere — two quick pushes race the same VM; daily backup can overlap a deploy.
  - No rollback: images are built cold on the VM, never pushed to a registry, and `docker image prune -f` destroys previous generations immediately.
  - Backup workflow disables host key verification and pipes `pg_dumpall` into Neon with errors ignored (`ON_ERROR_STOP=0 || true`) — partial restores indistinguishable from success; Redis and MinIO have no backups at all.
- **Fix:** CI-gated deploys, pre-traffic gated migrations, tagged images kept N generations, concurrency groups, real backup with restore drills.

### 2.10 Live secrets with a history of leakage, no rotation runbook
- VAPID keypair committed verbatim in `docs/next-steps-push-notifications.md:6-8` and byte-identical to the live values in `.env` — the production push identity needs rotation. Root `.env`/`.env.local` hold Neon passwords, `JWT_SECRET`, Gemini key, placeholder-grade `NEXTAUTH_SECRET` (untracked now, but `.gitignore` comments record a prior Neon-password leak to history). No rotation procedure exists anywhere; DB role passwords are first-boot-only (init script is idempotent-guarded by `IF NOT EXISTS pg_roles`, so later env changes silently do nothing).
- *(Refuted doc claim:* the "hardcoded public-key fallback" in the push hook no longer exists — `use-push-notifications.tsx:76-79` throws when unset.)

---

## 3. Engineering gaps by area

### 3.1 Gateway, auth & identity

| Sev | Finding | Where |
|---|---|---|
| High | No `trustProxy` — behind Caddy every request shares the Caddy container IP, so all clients share one rate-limit bucket; one abuser can 429 everyone | `gateway/src/index.ts:86,111-119`, `infra/Caddyfile:22-24` |
| Medium | Internal endpoints (`/v1/internal/introspect`, `/internal/users`, catalog `/internal/quizzes/:id/full`) have **zero service-to-service auth**; dev compose publishes identity :4001 to the host → unauthenticated bulk user dump / answer-key read for anything on the network | `identity/src/index.ts:175-201`, `catalog/src/index.ts:188-238`, `docker-compose.yml:191-192` |
| Medium | Any authenticated user can read any other user's profile (email, isAdmin) via `/v1/users/:id` — no self-or-admin check | `identity/src/index.ts:203-211` |
| Medium | Rate-limit subject injection: login-email policy applied to **raw body before Zod validation** — attacker can exhaust a victim's login bucket (targeted DoS), split buckets by case variants, mint unlimited keys; Redis-down = undocumented fail-closed 500s after multi-second ioredis hangs | `gateway/src/index.ts:113-116`, `redis-kit/src/rateLimit.ts` |
| Medium | CORS reflects any origin on gateway and identity (`origin: true`) | `gateway/src/index.ts:87`, `identity/src/index.ts:51` |
| Medium | Session lifecycle: no logout/revoke/password-change/reset endpoints exist at all; logout clears localStorage only; 120s positive introspection cache delays any future revocation | identity routes; `web/hooks/use-auth.tsx:120-131` |
| Low | Signup TOCTOU surfaces P2002 as 500; "user already exists" enables enumeration; no password max length/complexity; USER_CHANGED emitted on every login (event churn) | `identity/src/index.ts:126-138,102-115` |
| Low | Caddyfile hardcodes a personal sslip.io host embedding a VM IP; docs reference a `DOMAIN_PLACEHOLDER` that doesn't exist | `infra/Caddyfile:22`, `DEPLOYMENT.md:165` |

Header scrubbing itself verified correct: inbound `x-user-*` deleted then re-stamped on **every** proxied request including public routes (`gateway/src/index.ts:174-188`). The trust model holds only while services are unreachable except via the gateway — worth stating as a deployment invariant (and enforcing via prod overlay, which does null host ports correctly).

### 3.2 Catalog & AI generation

| Sev | Finding | Where |
|---|---|---|
| High | AI worker creates quizzes with bare `prisma.quiz.create` — **no outbox event**, so every AI-generated quiz is invisible to analytics dimensions until manually edited | `ai-worker.ts:113-125` vs admin POST `index.ts:407-433` |
| High | No DELETE (subject/chapter/quiz) publishes any change event on compacted topics — replaying from offset 0 resurrects deleted entities forever | `index.ts:272-287,321-335,499-504` |
| High | Zero Zod validation in catalog (contracts are plain interfaces); PATCH quiz / PUT question copy fields raw (`correctAnswer: 99`, `duration: "abc"` accepted); no error handler → Prisma errors surface as 500s instead of 400/404/409 | `dto/catalog.ts`, `index.ts:454-497,580-586` |
| Medium | Gemini output trusted blindly: options/answer mapped with no shape/range validation; greedy JSON regex captures junk; user-controlled title/sections interpolated raw into prompt (injection) | `ai-worker.ts:21-57` |
| Medium | Jobs stranded in `in_progress` if worker dies mid-run (no reaper); late failure after quiz create loses `resultQuizId` | `ai-worker.ts:87,129-132` |
| Medium | Question-bank model has zero secondary indexes while serving ILIKE substring search, tag-JSON contains, difficulty/section filters, createdAt sort — sequential scans; UI fetches `limit=1000` and paginates client-side so server pagination is dead code; repeated `?tag=` params break the filter | `schema.prisma:62-80`, `index.ts:523-540`, `question-bank/page.tsx:84-90` |
| Medium | Dead scheduling fields: `Quiz.startTime/endTime` accepted nowhere, enforced nowhere ("Coming Soon" card in admin UI); PATCH cannot clear `chapterId` | `schema.prisma:50-51`, `admin/page.tsx:932-936` |
| Low | Public quiz detail serves draft/inactive quiz metadata inconsistently vs chapter listing; no-op PATCHes bump version + emit events; silent JSON coercion masks corruption (`parseJsonField` → `[]`); trace IDs missing from most envelopes | `index.ts:163-183,464-476`, `database-utils.ts:3-33` |

### 3.3 Assessment (attempt lifecycle)

The state machine's core is solid: CAS submit with loser-replay, snapshot immutability, same-transaction outbox writes, both hand-written partial indexes present in migration SQL. But:

| Sev | Finding | Where |
|---|---|---|
| High | **Autosave races submit**: autosave checks owner/status/expiry once, then performs per-answer upserts with no transaction/re-check. An autosave interleaving with the winning CAS mutates answers *after* they were scored → result renders new selections with old correctness flags | `attempt-service.ts:198-246` vs `:265-279,372-385` |
| High | **Blind status flips clobber SUBMITTED→EXPIRED**: start-path and autosave-expiry do unconditional `status: "EXPIRED"` updates based on stale reads; if submit CAS landed in between, a scored attempt becomes permanently 409-on-result | `attempt-service.ts:113,206-208` |
| High | Resume requires catalog availability: full-quiz fetch (with answer keys + base64 images) happens **before** the resume lookup — a student with a live attempt cannot resume if catalog is down or quiz deleted; the fetched payload is entirely discarded on the resume branch | `attempt-service.ts:70-78` |
| Medium | `clientSeq` stale-write guard is read-compare-write in JS — lost updates between concurrent autosaves; missing seq defaults to 0 so those writes always lose yet are counted as "saved" | `attempt-service.ts:212-242` |
| Medium | Autosave = sequential 2N queries, no `max()` cap on answers array (thousands possible), no transaction, question IDs never validated against snapshot | `dto/attempts.ts:20-22`, `attempt-service.ts:211-243` |
| Medium | Client-supplied `timeSpentMs` unbounded → Postgres Int overflow → 500 on autosave; value propagates into analytics sums | `dto/attempts.ts:15`, `schema.prisma:94` |
| Medium | `submitSource` is client-controllable — users can record their submits as `"timer"`/`"sweeper"` (provenance spoofing into analytics facts); should be derived server-side | `index.ts:92-95`, `dto/attempts.ts:25-28` |
| Medium | Submit is not expiry-gated — between server expiry and the 15s sweeper tick a client submit wins the CAS and records SUBMITTED/user instead of EXPIRED/sweeper | `attempt-service.ts:255-277` |
| Medium | Snapshot hash covers questions only — editing just `timeLimit` leaves old snapshot duration in force while negative-marking copies fresh; inconsistent freeze semantics | `attempt-service.ts:118-154` |
| Medium | Legacy reporting: identity failures → raw 500s (catalog failures degrade gracefully — asymmetric); bulk meta endpoint ships full questions JSON just to compute counts; admin analytics loads entire QuizResult table unbounded | `legacy.ts:306,339`, `catalog/index.ts:213-238`, `legacy.ts:212-226` |
| Low | Empty question set → NaN totalScore (unguarded division); duplicate-answer O(Q×A) resolution first-wins; selectedAnswer range unchecked; negative `negativeMarkValue` would reward wrong answers; snapshot find-then-create race → 500; admin DELETE masks all errors as 404; unique-constraint detection by error message string, conflates clientIdemKey violation with live-attempt conflict (idempotency key never actually used for replay); sweeper has no ORDER BY/drain | `scoring.ts:71-109`, `attempt-service.ts:120-137,171-178`, `index.ts:172-182`, `worker.ts:26-53` |

Scoring formula itself verified correct against 26 golden fixtures; uncovered edges: empty question set, duplicate/unknown IDs, out-of-range selections, negative marking values.

### 3.4 Analytics, leaderboards & exports

| Sev | Finding | Where |
|---|---|---|
| High | `USER_ERASURE_REQUESTED` has correct consumers but **no producer** — identity has no delete-account route and never emits the event; the whole erasure pipeline is inert | identity src (no emit), `rollup-consumer.ts:396-409`, `fanout-worker.ts:123-131` |
| Medium | PII survives erasure everywhere else: plaintext name/email frozen inside uncompacted `ATTEMPT_SUBMITTED` payloads (replay can resurrect identity post-erasure depending on cross-topic order), MinIO export objects persist indefinitely with no lifecycle/deletion, `q:lb:names` hash never expires/redacted and is fully `hgetall`'d per leaderboard read | `topics.ts:37-38`, `export-worker.ts:116-121`, `leaderboard.ts:43,52` |
| Medium | Attempts consumed before their quiz dimension get `chapterId/subjectId = null` **forever** — excluded from subject rollups, subject leaderboards, and subject-filtered exports; chapter repair fixes DimQuiz but never backfills facts | `rollup-consumer.ts:90-124,350-353` |
| Medium | `DailyRollup.uniqueUsers` uses quiz-scoped first-attempt flag for global/subject buckets — distinct-users-per-day overcounted ×(quizzes taken) | `rollup-consumer.ts:182-186,278-289` |
| Medium | Read-modify-write races on `QuizStats.bestScore/avgScore` and `optionCounts` JSON merge across partitions (attempts keyed by userId) — lost aggregates | `rollup-consumer.ts:152-214` |
| Low-Med | Post-commit Redis writes best-effort: crash between commit and ZADD permanently drops the attempt from leaderboards (dedup marker suppresses redelivery); no reconciliation/rebuild tool exists though rebuild-from-facts is feasible | `rollup-consumer.ts:292-303` |
| Low-Med | Export worker: no lease/timeout — crashed jobs stuck `running` forever; ProcessedEvent insert failure swallowed → duplicate S3 upload + duplicate completion event | `export-worker.ts:140-165` |
| Low | Dead cache invalidation (`cacheAnalyticsQuiz/User` deleted, never written); overview not invalidated on user changes; overview stampede accepted (cacheLock builder defined, unused repo-wide) | `rollup-consumer.ts:302,339,393`, `keys.ts:31` |

Leaderboard encoding math verified sound (< 2^53, GT semantics correct, weekly TTL rotation works). Edge cases: NaN timeSpent would poison the whole ioredis pipeline post-commit; >11.6-day times clamp to ties.

### 3.5 Notification, SSE & push

Verified correct: single-use GETDEL tickets, per-connection subscriber cleanup, heartbeat, two-stage fanout with paging, 410 deactivation, VAPID-absence short-circuit.

| Sev | Finding | Where |
|---|---|---|
| Medium | SSE per-user backlog is dead code — `publishToUser` is never called, so `Last-Event-ID` reconnect replay structurally can't work; gap between backlog read and subscribe loses events; event IDs not monotonic | `sse.ts:23-45`, `index.ts:282-289` |
| Medium | Consumer idempotency weaker than analytics (documented): effects-first, mark-later autocommit — crashes duplicate pushes/fanouts; P2002 swallow lets racers redo effects | `fanout-worker.ts:24-131` |
| Low | Announcement PUT skips priority validation (arbitrary strings land in push payloads); readership denominator counts projections, not true users; non-404/410 push errors leave dead subscriptions retrying forever | `index.ts:176-205`, `push.ts:46-49` |

### 3.6 Kafka infrastructure (shared)

| Sev | Finding | Where |
|---|---|---|
| High | `runConsumer` catches parse errors only — a handler throw escapes `eachMessage` (consumer stall → rebalance loop), and with hardcoded `fromBeginning: true` + catalog's always-false dedup stub, one malformed-but-valid message redelivers indefinitely. Log line claims "sending to DLQ"; **no DLQ exists** | `kafka-kit/src/consumer.ts:38-56` |
| Fixed-but-docs-stale | `maxPollIntervalMs` **is now passed through** to `kafka.consumer()` (commit `58cee42`) — ARCHITECTURE-CURRENT.md §7.5/§18.3/§20 still say it isn't | `consumer.ts:32-36` |
| Medium | traceId propagated by exactly one producer (catalog AI request); no consumer ever logs envelope.traceId — cross-service debugging breaks at the async boundary where it matters most | envelope producers/consumers repo-wide |

### 3.7 Web frontend

| Sev | Finding | Where |
|---|---|---|
| High | Gateway client drops everything except authorization/content-type (trace headers lost, cookies impossible), no upstream timeout/abort, buffers bodies fully — blocks any future streaming endpoint | `lib/gateway-client.ts:14-35` |
| High | Token + role in localStorage (XSS-exfiltratable long-lived bearer); client-only role gating; token "validation" is `includes("-") && length >= 10`; many call sites fall back to fake `Bearer student-token-placeholder` masking logged-out states as 401 noise | `hooks/use-auth.tsx:55,63`, `app/quiz/[id]/page.tsx:92` etc. |
| High | Quiz timer never re-syncs with server (pure client decrement — background-tab throttling skews the displayed clock); hidden-tab time billed to current question (no visibilitychange handling); no page-close warning | `app/quiz/[id]/page.tsx:147-176` |
| High | Autosave fire-and-forget: `.catch(console.warn)`, no retry queue/offline buffer/periodic flush — a blipped save is lost until next interaction on that question | `app/quiz/[id]/page.tsx:189-226` |
| High | N+1 fetching on every student surface: analytics/history/attempted-quizzes/recent-attempts each fetch ALL attempts then one result request per attempt (200+ requests per visit at scale), duplicated logic ×4 | `app/analytics/page.tsx:48-62` etc. |
| High | Toast system wired but `<Toaster />` never mounted — every toast in the app is invisible; PWA install/update component (`pwa-handler.tsx`) likewise never imported | `components/push-notifications-manager.tsx`, `app/layout.tsx:61-75` |
| Medium | Abandoned/dead code shipped: 4 dead analytics components, 7 orphaned debug/test pages publicly routable (`/test-api`, `/diagnose`, `/clear-cache`, …), unused mock fixtures, duplicated stylesheets/hooks, leftover AI-assistant commentary in tailwind config | components/, app/admin/page.tsx:122-221 |
| Medium | Undefined CSS classes (`neu-*`, 17 occurrences) render unstyled remnants; 10 advertised themes but only light/dark defined; hardcoded light-only grays break dark mode | `flash-questions.tsx`, `app/layout.tsx:66` |
| Medium | Accessibility: quiz options are `<div onClick>` — no keyboard selection, no ARIA state, screen-reader users cannot take a quiz; palette conveys state visually only; `maximumScale: 1` disables pinch zoom (WCAG) | `app/quiz/[id]/page.tsx:587-597`, `app/layout.tsx:41` |
| Medium | Base64 images embedded in quiz JSON ship on every GET/PATCH of the whole quiz (all questions on every question CRUD) — payload explosion + concurrent-editor clobber window | `app/admin/quiz/[id]/page.tsx:271-372` |
| Medium | Service worker: dynamic cache never pruned, skipWaiting+claim mid-session takeover, `offline.html` exists but is never served (no navigation fallback) | `public/sw.js` |
| Low | Optimistic-concurrency surfaced inconsistently (one page maps 409 nicely; two others collapse it to generic failure or silence); profile achievements computed from stale state + fake streak; admin analytics totalUsers counts result ids; ~63 console.logs incl. bearer-token prefix logging; demo creds disagree between hint text and quick-fill buttons; decorative icon pickers; dead admin modal buttons (Delete/Bulk Upload with no onClick) | various (see agent detail) |

### 3.8 Infra, Docker & runtime

| Sev | Finding | Where |
|---|---|---|
| High | Caddy terminates the only public surface with **zero security headers** (no HSTS/CSP/XCTO), no compression, no edge limits, implicit reliance on default streaming for SSE | `infra/Caddyfile:22-24` |
| Medium | All 7 containers run as root (no `USER` directive); no resource limits on any container (OOM risk on the t3.small-class VM target); backend runs under `tsx` with full devDependencies shipped (deliberate, but compounds the above) | all Dockerfiles, compose |
| Medium | Floating image tags: `minio/minio:latest`, `minio/mc:latest`, `caddy:2-alpine` — the only unpinned dependencies in an otherwise pinned stack | `docker-compose.yml:113,135`, prod:15 |
| Medium | Dev compose publishes Postgres/Redis/MinIO/Redpanda on all host interfaces (no `127.0.0.1:` bind), passwordless Redis, `minioadmin` root reused as the app's S3 creds | `docker-compose.yml:42-148` |
| Medium | Redis has **no persistence volume** — leaderboards/counters/caches wiped on every recreate; weekly boards die mid-week; cold rate-limit windows after deploys | `docker-compose.yml:60-70` |
| Low-Med | Worker containers have no healthchecks; deploy sed-mutates tracked compose file on the VM (config drift from repo); backup workflow SSH uses `StrictHostKeyChecking=no` and re-emits the key through step outputs | compose workers, `deploy-ec2.yml:77`, `db-backup.yml:19-30` |

Positives worth keeping: prod overlay correctly strips all host ports except Caddy 80/443; healthcheck/depends_on graph is correct throughout; uniform log rotation; manifest-before-source layer caching in all Dockerfiles.

### 3.9 Testing & quality

- Total automated tests: **4 files**. One substantive suite (scoring, 26 cases — good). One SW unit test. Two Playwright specs that are **structurally dead**: config points at `./tests/e2e` while specs live in `tests-e2e/`, global-setup references a nonexistent web prisma seed; running the suite finds 0 tests.
- Zero tests for: CAS submit/replay, sweeper, autosave/clientSeq conflicts, resume, gateway header scrubbing, rate limiter, rollup projections, leaderboard encoding, notification fanout, CSV escaping.
- No integration/e2e test exercises web → gateway → service; nothing in CI boots a container.
- Six services have stub lint scripts; four packages have none — `turbo lint` effectively covers only the web app. No vitest configs anywhere.

### 3.10 Observability & ops readiness

- Tracing/metrics/alerting: none beyond request-scoped `x-trace-id` + pino logs (TECH_STACK.md's "OpenTelemetry implemented" is false). Trace IDs don't survive into Kafka consumers. Logs die with the VM (~30 MB/service ceiling), nothing shipped or searchable.
- No alerting on backup failure, unhealthy containers, consumer lag, or deploy outcome. Healthcheck failures are consumed by nothing.
- Backups: nightly `pg_dumpall` to a 90-day GH artifact + the fragile Neon pipe; no PITR, no encryption, no restore drills; Redis/MinIO/Redpanda unprotected.

### 3.11 Documentation drift (docs ≠ code)

| Item | Reality |
|---|---|
| `ARCHITECTURE-CURRENT.md` §7.5/§20: "maxPollIntervalMs not passed to kafkajs" | Fixed in commit `58cee42`; docs stale |
| README "Import/Export: Bulk operations" | No server-side bulk import/export exists; only a client-side per-quiz JSON manager + a non-functional placeholder button; no CSV for question bank |
| README links `LICENSE` | No LICENSE file exists |
| DEPLOYMENT.md | Wrong workflow filename, wrong secrets, wrong user, wrong repo URL, claims CI gating that doesn't exist, references nonexistent DOMAIN_PLACEHOLDER |
| ORACLE_SETUP.md | Written for Oracle ARM topology; actual deploy is AWS EC2 Ubuntu per workflow comments |
| TECH_STACK.md | Claims OTel implemented (false) and outbox = "exactly-once" (it's at-least-once) |
| HOSTING.md troubleshooting | References `01-schemas-roles.sql` — file is `.sh` |
| Repo hygiene | Committed junk: `sbi-po-profit-and-loss.json` (content dump w/ answer keys) and `tmp/gate.check.ts` at repo root |

---

## 4. Product design review

### 4.1 What genuinely works
A complete, coherent exam-prep loop already exists end-to-end: browse subjects → chapters → quizzes; take quizzes with a real exam-style runner (palette, mark-for-review, save&mark, clear response, auto-advance, unanswered warning on submit, resume with saved answers, negative-marking aware); results with score breakdown, section bars, per-question timing, and expandable explanations; history with search/filter/trends; analytics dashboards (score trend, radar, sectional strengths); async AI quiz generation with progress polling and partial-failure drafts; announcements with SSE + web push + read receipts; admin content CRUD with optimistic concurrency; streaming CSV exports. The neobrutalist landing page is polished.

### 4.2 Rough edges (fix before adding features)
1. **Leaderboards advertised, not delivered** — landing page promises national rankings; Redis kit + API exist; no UI calls it.
2. **Pricing fiction** — ₹0/₹299/₹599 tiers promise enforced limits with zero billing/entitlement code.
3. **Goals feature orphaned** — no nav link, stored wholly in localStorage, inputs silently truncated by a 200-entry results shim; dies with browser profile.
4. **Profile is hollow** — fake hardcoded streak, achievements computed from stale zeros, no change password/name/email/delete-account/notification prefs.
5. **Discovery gaps** — no search by quiz name anywhere; difficulty filter collected but never applied; attempted quizzes filtered out of listings with no retake tab; retake requires digging through history.
6. **Two competing history pages** with different capabilities; dashboard "Recent Attempts" shows literal "Quiz attempt" because summaries lack quiz names; Quick Practice card permanently shows "0 Questions" (state never populated).
7. **AI generator friction** — form collects topic/duration/negative marking the API silently drops (documented field-loss gap); generated content can't be reviewed/edited inline before publish despite tips claiming otherwise; fully-succeeded generations go live instantly with no review queue.
8. **Admin dead controls** — Delete/Bulk Upload buttons with no handlers in a visible modal; announcements save/delete failures silent; confirm()/alert() dialogs everywhere; scheduled exams permanently "Coming Soon."
9. **Brand whiplash** — metadata title "Banking Exam Preparation", apple title "Quiz App", meta title "Quizzy", `generator: 'v0.dev'` in layout.

### 4.3 Missing vs comparable platforms (Testbook / Gradeup / Kahoot / Quizizz)
Previous-year papers · current-affairs feed · video/lesson content · doubt solving/comments · cross-session bookmarks · test-series scheduling/calendar · exam-target catalogs · pass/subscription gating · section-wise timers (real exam patterns use per-section time) · percentiles/comparisons · hosted multiplayer/live games (lower priority given exam-prep positioning).

---

## 5. Feature suggestions (prioritized)

### Tier 1 — leverage what already exists (cheap, high impact)
1. **Leaderboard UI** — the hardest part (encoding, rotation, consistency) is built and verified; only presentation is missing. Global/weekly/quiz/subject tabs + percentile display.
2. **Quiz scheduling** — `startTime/endTime` columns already exist; wire API validation + enforcement + admin UI; removes a permanent "Coming Soon" card.
3. **Account management pack** — change password, edit profile, delete account. Delete account finally gives `USER_ERASURE_REQUESTED` its missing producer and activates the erasure pipeline you already wrote consumers for.
4. **Server-enriched attempt lists** — one list endpoint returning quiz titles + summaries kills four N+1 pages, fixes "Quiz attempt" placeholders, and powers proper retake buttons.
5. **CSV import/export for the question bank** — the README already promises it and the analytics CSV pipeline (escaping, streaming, MinIO) exists to copy patterns from.

### Tier 2 — core exam-prep depth
6. **Bookmarks + wrong-answer notebook** — persist flagged questions across sessions; add a practice mode that resurfaces your incorrect questions (simple Leitner/spaced repetition). This is the single highest-retention feature in this category.
7. **Section-wise timers & exam patterns** — real exams (SBI PO etc.) time sections independently; extend snapshot schema with per-section limits.
8. **Percentiles & peer comparison** — computable from existing AttemptFacts; show "you beat X% of takers" on results.
9. **Study streaks/goals server-side** — migrate goals from localStorage to a small user-goals table fed by attempt events; make the streak real (UserDailyActivity already tracks it).
10. **AI review queue** — generated quizzes land as inactive drafts by default; admin reviews/edits inline (the editor exists) then activates. Pair with the field-propagation fix (chapter/duration/negative marking through the job).

### Tier 3 — engagement & scale
11. **Daily quiz / current-affairs digest** — announcement infra + push already supports it; add a scheduled job creating a daily quiz and a morning push.
12. **Question reporting & explanation rating** ("this answer is wrong") — cheap quality loop for AI-generated content; feeds an admin moderation queue.
13. **Previous-year papers & test series packaging** — group quizzes into purchasable/free series with progress tracking (mostly catalog modeling + UI).
14. **Offline-first PWA hardening** — serve the existing offline.html, prune caches, controlled updates; queue attempt autosaves in IndexedDB during outages (pairs with the frontend autosave-retry fix).
15. **Email notifications** — password reset (impossible today), weekly performance recap; requires an email provider integration in notification-svc.

---

## 6. Recommended sequencing

**Now (security/integrity, days):** §2 items 1–6 (token redesign, password hashing migration, seed lockdown, secret rotation incl. VAPID, AI route gating, stats gating); trustProxy; CSV escaping; remove committed junk files.

**Next (correctness, 1–2 weeks):** outbox transaction fix; autosave/status-race fixes (conditional updateMany transitions); resume-before-fetch; DLQ + handler-error isolation in runConsumer; delete-event publication; Toaster/PWA mounting; timer sync + autosave retry queue.

**Then (operational maturity, ongoing):** CI-gated deploys, pre-traffic migrations, image registry + rollback, concurrency groups; Redis persistence + backups w/ restore drills; one true e2e spec exercising web → gateway → assessment; security headers at Caddy; non-root containers + resource limits; metrics/alerting baseline (even uptime + consumer lag + deploy-failure alerts only).

**Alongside (product):** Tier 1 features immediately after the security pass — every one of them monetizes existing backend work.

---

*Method note: produced from a full-repository review on 2026-08-26 — six parallel deep-dive passes (security/auth, catalog+AI, assessment, analytics+notification+shared kits, web frontend, infra/CI/testing/docs) cross-checked against `ARCHITECTURE-CURRENT.md` §20 known gaps. Documented-gap claims were individually verified or refuted; refutations and stale-doc findings are called out inline.*
