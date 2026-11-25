# Supabase Edge Functions

## Functions

`ai-assistant` accepts `POST { "prompt": "..." }` with a Supabase user access token. It validates the token using `auth.getUser()`, obtains profile and course-directory context using the caller's JWT and PostgREST/RLS, and ignores any client-supplied context. The prompt is normalized and capped at 2,000 characters; response text is stripped of HTML-like tags and capped at 3,000 characters. The endpoint returns a JSON string field (`answer`) intended to be rendered as text only (`textContent`/framework escaped interpolation), never through `innerHTML` or raw HTML rendering. Provider failures/timeouts return a generic plain-text fallback. Do not add prompt, provider output, identity, or credential logging.

The swappable OpenAI-compatible provider reads `AI_PROVIDER`, `AI_BASE_URL`, `AI_ALLOWED_HOSTS`, `AI_API_KEY`, and `AI_MODEL`; allowed adapter labels are `openai-compatible`, `openai`, `deepseek`, and `custom`. `AI_BASE_URL` must be HTTPS and its exact hostname must appear in the comma-separated `AI_ALLOWED_HOSTS` secret. URLs with credentials, query/fragment components, or nonstandard ports are rejected, and redirects are disabled to prevent credential/prompt forwarding. Configure secrets only in Supabase Edge Function secrets. Missing or invalid provider config fails closed to the assistant fallback; the fallback contains no generated content.

`grant-role` accepts `POST { "user_id": "uuid", "role": "student|faculty|admin", "college_id": "uuid|null", "reason": "optional" }`. It verifies the user using `auth.getUser()` and checks the actor's current `profiles.role` from the database using the caller-scoped client. It does not trust role claims or user metadata. Only after that check does it instantiate a service-role client, which is used only in this function to check the college, update the target profile and write `role_change_audit`. An audit failure triggers a compensating role revert and returns failure. Service key absence fails closed. Audit currently captures role transition and reason; college transitions are not separately represented by the existing audit schema.

Both endpoints use `consume_user_rate_limit`, a SECURITY DEFINER RPC callable only by `service_role`. Each Edge handler first verifies the caller with `auth.getUser()` and passes that verified subject ID; callers cannot execute the RPC directly or choose arbitrary action keys/limits. The database enforces only the fixed `ai-assistant` (20/minute) and `grant-role` (10/minute) configurations, uses an atomic upsert, and replaces each user's stale same-action window row so retained counter cardinality is at most one per active action per user. The `rate_limits` table remains inaccessible to client roles. The service-role key is used only inside Edge function code and is never returned to callers.

## Deployment/configuration checklist

- Deploy functions with Supabase CLI after applying migrations; this change does not deploy or run migrations.
- Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Edge function runtime only), and provider secrets (`AI_PROVIDER`, `AI_BASE_URL`, `AI_ALLOWED_HOSTS`, `AI_API_KEY`, `AI_MODEL`) in the Edge Function environment. Never put service/provider keys in frontend bundles.
- Set `APP_ORIGIN` to the exact frontend origin in production; review CORS before deployment.
- Ensure the Supabase project has the `profiles`, `courses`, `colleges`, `role_change_audit`, and `rate_limits` schema from the existing migrations. Apply migrations `202611260005_edge_rate_limit_rpc.sql` and `202611260006_edge_security_hardening.sql` using migration tracking.
- Test invalid/expired JWT, non-admin role grant, forged client context, cross-college context, provider timeout/malformed response, absent secrets, concurrent rate-limit calls, and audit-write failure. Verify that frontend display uses escaped text.

## Operational privacy

Handlers return generic error messages and do not log request bodies, prompts, response contents, user IDs, provider URLs, or secrets. Avoid adding request/response logging in gateways and observability pipelines. Use TLS and restrict the AI provider account/data retention to the application's approved data policy. The course directory is deliberately minimal (code/title/term); never include submissions, grades, private profile fields, or social content in assistant context without a separate review.
