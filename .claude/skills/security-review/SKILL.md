---
name: security-review
description: Review or harden authentication, authorization, input handling, quiz integrity, API exposure, secrets, uploads, rate limits, dependencies, and deployment security in the quiz platform.
---

# Security Review

Perform threat-driven review with special attention to quiz integrity and microservice trust boundaries.

## Review process

1. Identify assets, actors, entry points, service boundaries, stored data, and abuse goals.
2. Trace untrusted data from browser/API/event/upload through validation, authorization, persistence, logging, and output.
3. Rank findings by exploitability and impact; include file/line evidence and a concrete remediation.
4. Apply focused fixes only when requested or clearly within task scope, then add negative tests.
5. Distinguish confirmed vulnerabilities from defense-in-depth suggestions.

## Checklist

### Identity and access

- Token/session validation, expiry, revocation, and secure cookie/header handling.
- Service-side role and resource-ownership checks on every sensitive operation.
- Gateway checks are not the only authorization layer.
- Login and expensive endpoints have appropriate rate limits without unsafe fail-open behavior.

### Quiz integrity

- Correct answers and scoring rules are not exposed before completion.
- Scores are calculated server-side.
- Attempt ownership, timing, finalization, and duplicate submissions are enforced atomically.
- Admin-only quiz/question/analytics actions cannot be reached by ordinary users.

### Input and output

- Zod validates HTTP and Kafka boundaries.
- Upload type, size, count, parsing complexity, and object keys are constrained.
- CSV exports prevent spreadsheet formula injection.
- Errors and logs do not leak secrets, answer keys, internals, or personal data.
- URLs and downstream requests are protected from SSRF/open redirects where applicable.

### Infrastructure and data

- `.env*` secrets remain ignored; examples contain placeholders only.
- Database roles stay schema-scoped and least-privileged.
- Production ports are not exposed around Caddy.
- CORS, TLS, headers, backups, dependencies, Kafka, Redis, and MinIO access are reviewed.

## Guardrails

- Never include real exploit tokens, credentials, or user data in reports/tests.
- Do not run destructive or high-volume attack tooling against non-local systems without explicit authorization.
- Do not weaken controls merely to make a failing flow work.

## Verification and output

Run relevant typechecks and negative tests. Report findings ordered by severity with: title, evidence, impact, realistic attack path, remediation, and verification. If no vulnerability is found, state the scope and residual risks rather than claiming the system is secure.
