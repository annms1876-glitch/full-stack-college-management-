# Edge Functions, Provider, RPC and Migration Security Audit

**Scope:** Static review of all repository Supabase Edge Functions (`supabase/functions/**`), shared helpers/provider, migrations `202611260001`–`202611260006`, and related backend/security documentation. Relevant frontend response rendering contract was reviewed through the docs; no frontend use of the AI endpoint was present in this scope. **Verdict: PASS (static source review): no confirmed high or critical exploit found.** This is not a live deployment certification: migrations, effective grants, runtime requests, gateway logging, CORS, and production secrets were not tested.

## Attack-surface review

### JWT validation and role authority

Both endpoints require a Bearer header and call Supabase `auth.getUser()` through a caller-scoped client before protected work. Invalid/expired tokens fail closed. `grant-role` retrieves the acting profile's `role` using that caller-scoped client and requires `admin`; it does not use caller-supplied role, user metadata, or JWT role claims. Profile role/college self-service mutations are excluded by narrow profile column grants and bootstrap assigns `student` regardless of signup metadata. The service-role client is created only after the admin check and its key is not returned or logged.

The role grant handler validates role and UUID formats, checks a non-null college exists, reads the target's old role/college, writes the role, and records an audit row; on audit failure it attempts a compensating revert. College changes are not represented in the current role audit schema, and compensation is best-effort if the revert itself fails. These are audit/operational limitations, not a demonstrated privilege bypass. Any administrator can grant any listed role; this is the intended admin trust boundary and should be guarded operationally.

### Context isolation and prompt injection

`ai-assistant` ignores any client-provided context, reads the caller's profile and course directory using the caller JWT/RLS, constrains course lookup to the caller profile's college, and sends only course code/title/term plus the user's prompt to the provider. It does not include submissions, grades, private profile fields, or social content. Missing profile/query errors fail closed. Prompt injection may influence model text, but the model has no privileged tools/actions and the reviewed context contains no sensitive data; system instruction wording is not treated as a security boundary.

### Rate limit RPC and races — prior H-1

Migration `202611260006_edge_security_hardening.sql` drops the legacy signatures, deletes old arbitrary-key counters, recreates `consume_user_rate_limit(uuid,text,integer,integer)`, revokes EXECUTE from `PUBLIC`, `anon`, and `authenticated`, and grants it only to `service_role`. The function accepts only the fixed `ai-assistant` (20/60s) and `grant-role` (10/60s) tuples. Shared Edge code independently obtains the verified identity using `auth.getUser()` and calls the RPC with fixed per-handler parameters; authenticated callers cannot invoke it directly or choose counter keys/limits. The RPC deletes stale same-action rows and atomically upserts on the unique key, so concurrent requests increment a shared counter and retained cardinality is bounded to at most two rows per user (one per fixed endpoint).

**Prior H-1 disposition: FIXED IN SOURCE**, subject to applying migration 006 and verifying deployed function ACLs. This addresses the direct-RPC arbitrary action-key/storage-growth exploit. A live grant inspection/concurrent integration test remains necessary.

### Submission grading grants — prior additive-REVOKE issue

Migration 006 explicitly revokes table-level UPDATE from `anon, authenticated` on `assignment_submissions` before granting only column UPDATE for `status`, `grade`, and `feedback`. This corrects the additive privilege issue: the earlier column-level REVOKE alone could not cancel the broad table grant. RLS still scopes those updates to faculty assigned to the relevant course. `student_id` and `assignment_id` are not granted as writable columns. Source review finds no student grading path and no remaining faculty write permission to the protected identity fields under the corrected grants.

**Prior issue disposition: FIXED IN SOURCE**, contingent on migration execution and effective-ACL verification. Faculty can intentionally grade/status-update rows in their own course.

### Provider URL, secrets and failure handling — prior URL constraint issue

`ai-provider.ts` requires HTTPS, no URL credentials, query, fragment, or nonstandard port, and an exact hostname listed in `AI_ALLOWED_HOSTS`; redirects are disabled. Provider/model/key settings are read from environment, and missing/invalid settings fail closed. Requests time out after 12 seconds. Non-2xx, malformed JSON/shape, timeout, and configuration failures propagate only to the handler's generic fallback; handler catch blocks do not emit prompt, output, identity, URL, or secret logs.

**Prior provider URL issue disposition: FIXED IN SOURCE** compared with unrestricted configured URLs. Deployment must still protect the environment secrets and configure a narrow trusted hostname allowlist: the allowlist itself is trusted deployment configuration, not an application-level defense against an operator configuring an unsafe host. `APP_ORIGIN` defaults to `*` if unset, so production should set an exact origin; CORS is not authorization, and JWT validation remains required.

### HTML/output injection — prior sanitizer limitation

The AI handler removes HTML-like tags and Markdown-style links, but these regex operations are not a complete HTML/Markdown sanitizer and must not be relied on as one. The JSON answer is untrusted text. The backend contract explicitly requires escaped/text-only display (`textContent` or framework escaped interpolation), never `innerHTML` or raw HTML rendering. No frontend invocation/rendering of this endpoint was found in the reviewed project surface.

**Prior output-sanitization issue disposition: LIMITATION REMAINS, appropriately mitigated only by a text-only rendering contract.** If an HTML rendering path is added, use a maintained sanitizer with a strict allowlist and re-audit the actual UI sink.

### Request limits and availability

The prompt is normalized and capped at 2,000 characters and output at 3,000 characters; rate limits are applied after authentication. However, handlers call `req.json()` without an explicit request-body byte limit, and rate-limit the user rather than IP/network before parsing. An authenticated client can send a very large JSON body, consuming gateway/function parsing resources before prompt truncation. This is a **LOW/MEDIUM availability hardening gap**, not a demonstrated high/critical exploit in this source review; enforce a small `Content-Length`/streamed byte cap at the edge and/or gateway. The request parser accepts any JSON object shape and ignores extra fields, without exposing them to the provider.

## Result and deployment checks

**PASS — no high/critical source-level exploit identified.** Prior H-1, additive UPDATE privilege, and unrestricted provider URL findings are fixed in the source migrations/code; incomplete AI HTML stripping remains safe only if the documented text-only rendering rule is preserved. No live DB/API behavior was exercised.

Before production reliance, apply migrations in order and inspect effective EXECUTE/table/column privileges (especially `consume_user_rate_limit` and `assignment_submissions`), then test expired/invalid JWTs, forged role metadata/body values, student role/grading attempts, cross-college context, prompt injection, concurrent rate-limit calls and row cardinality, provider timeout/non-2xx/malformed output, audit insert/revert failure, and actual frontend rendering. Confirm exact production `APP_ORIGIN`, trusted `AI_ALLOWED_HOSTS`, provider data-retention controls, and absence of prompt/PII/secret logging in gateways and observability systems.
