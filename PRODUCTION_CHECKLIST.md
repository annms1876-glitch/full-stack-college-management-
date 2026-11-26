# CampusPulse Production Checklist

Use this as a release checklist, not as proof that a production release has occurred.

## Code and security

- [x] API/security tests pass locally.
- [x] Secret scan passes.
- [x] Browser runtime exposes no service-role/AI key.
- [x] Baseline and new module tables have RLS source definitions.
- [x] Assignment reads are enrollment-scoped.
- [ ] Review migration against target schema drift.
- [ ] Run pgTAP and adversarial cross-college tests on staging.

## Product and QA

- [x] Student assignment submission path is connected.
- [x] Faculty/admin sample-only areas are labelled honestly.
- [ ] Wire and test academic module APIs/UI.
- [ ] Test loading, empty, error, keyboard, and screen-reader states.
- [ ] Test 360, 390, 768, 1366, and 1920px viewports.
- [ ] Run authenticated student/faculty/admin browser smoke tests.

## Release

- [ ] Configure Clerk's Supabase JWT template, Supabase JWT verification, and trusted Clerk-to-profile provisioning.
- [ ] Configure browser runtime values and server/Edge secrets in the appropriate secret stores.
- [ ] Apply migrations and deploy Edge Functions.
- [ ] Run `npm ci`, `npm test`, `npm run scan:secrets`, and `npm run build:vercel`.
- [ ] Verify Vercel runtime config and all portal routes.
- [ ] Verify Storage signed URLs and expiry.
- [ ] Capture monitoring, backups, rollback, and incident contacts.

Unchecked items are not claims of completion; they require the blocked live environment access described in the audit.
