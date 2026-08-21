---
name: security-review
description: Master skill for security reviews, authentication hardening, header scrubbing, answer key isolation, rate limit policy evaluation, formula injection prevention, and vulnerability assessments. Trigger whenever reviewing code for security risks, modifying gateway header scrubbing, inspecting answer key paths, evaluating rate limits, checking secret exposure, or hardening authorization controls.
---

# Security Review & Trust Architecture

This skill defines the security invariants and trust boundaries across the platform.

## 9 Critical Security Invariants

1. **Gateway Header Scrubbing (Trust Boundary):**
   - The Gateway MUST strip inbound `x-user-id`, `x-user-name`, `x-user-email`, and `x-user-is-admin` headers from every incoming browser request before proxying.
   - Headers are re-set ONLY from valid identity introspection (`introspectToken`).
   - Downstream services trust `x-user-*` headers because the gateway is the sole public ingress.
2. **Answer Key Physical Isolation:**
   - Answer keys (`correctAnswer`, `explanation`) live exclusively in `catalog-svc`.
   - Public API routes (`GET /v1/quizzes/:id`) MUST NOT include `correctAnswer`.
   - `AttemptQuestionDTO` in `@quiz/contracts` structurally omits `correctAnswer`.
   - Keys are revealed ONLY via `GET /v1/attempts/:id/result` AFTER `status === SUBMITTED`.
   - Answer keys MUST NEVER be emitted onto Kafka event topics.
3. **Internal Endpoint Unreachability (`/internal/*`):**
   - Internal routes (`GET catalog-svc/internal/quizzes/:id/full`, `POST identity-svc/v1/internal/introspect`) MUST NOT be registered in `apps/gateway/src/index.ts`.
   - Internal endpoints are physically unreachable from outside the private container network.
4. **Postgres Role & Schema Isolation:**
   - 5 distinct Postgres login roles (`identity_rw`, `catalog_rw`, `assessment_rw`, `analytics_rw`, `notification_rw`).
   - `REVOKE ALL ON SCHEMA FROM PUBLIC;` + search path pinning prevents cross-schema SQL joins and data breaches even if SQL injection occurs in one service.
5. **Rate Limiting & Cost Control:**
   - Abuse limits: `loginByIp` (50/5m), `loginByEmail` (30/15m), `signupByIp` (3/60m).
   - Expensive operation limits: `aiGenByUser` (5/h), `exportByUser` (3/h).
   - High-frequency limits: `answersByAttempt` (120/m), `submitByAttempt` (5/m).
6. **CSV Formula Injection Prevention (`csvEscape`):**
   - All string fields exported in CSVs starting with `=`, `+`, `-`, `@`, `\t`, or `\r` MUST be escaped with a leading single quote (`'`).
7. **Single-Use Ticket Authentication for SSE:**
   - SSE connections use 30s single-use tickets consumed via Redis **`GETDEL`** (`q:sse:ticket:<t>`) to prevent URL token leakage and stream replay attacks.
8. **Push Secret Protection:**
   - `PUSH_SEND_REQUESTED` event payloads carry ONLY `subscriptionId` and `announcementId`.
   - Web push secrets (`endpoint`, `p256dh`, `auth`) MUST NEVER be published to Kafka topics.
9. **Known Baseline Security Debt (Documented Invariants):**
   - `identity-svc` currently stores and compares passwords in plaintext.
   - Tokens are opaque unsigned strings `${userId}-${ts}-${rand36}` (max age 30 days).

## Verification Checklist

```bash
pnpm --filter gateway typecheck
pnpm --filter security-review typecheck 2>/dev/null || pnpm typecheck
```

- Verify spoofed `x-user-is-admin` headers are stripped by the gateway.
- Verify answer keys are not exposed in `/v1/quizzes/:id` metadata responses.
- Verify internal endpoints (`/internal/*`) are absent from the gateway proxy table.
- Verify CSV export fields starting with `=` are escaped with `'`.
