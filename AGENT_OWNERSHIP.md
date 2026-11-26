# Agent Ownership and Handoffs

| Workstream | Owner | Boundary | Current result |
|---|---|---|---|
| Architecture/integration | Lead architect | contracts, sequencing, conflict resolution | Baseline and plan recorded |
| Frontend/UI/UX | Frontend specialist | portals, routes, responsive states, accessibility | Existing local/demo boundaries documented; live module wiring pending |
| Database/RLS | Supabase specialist | schema, constraints, grants, policies, migrations | Assignment scope fixed; academic foundation added |
| Authentication/security | Security specialist | trusted roles, identity derivation, secrets, Edge boundaries | Existing hardening retained; no frontend privileged keys |
| Academic workflows | Academic specialist | attendance, exams, timetable, grades | Backend table foundation added; API/UI pending |
| Student affairs | Student-services specialist | grievances, scholarships, fees, support | Backend table foundation added; API/UI pending |
| AI/Edge Functions | Edge specialist | auth, bounded context, provider allowlist, rate limits | Existing functions statically reviewed; live deployment blocked |
| Testing/QA | QA specialist | unit/security, browser/responsive, regression | Local tests/builds executable; live browser QA blocked |
| DevOps/deployment | DevOps specialist | migrations, secrets, Vercel/Supabase release, rollback | Credentials/CLI blocked in this environment |

All changes land through the integration owner. No owner may weaken RLS or expose service-role/AI credentials to browser code. Blocked work must remain labelled blocked until executed.
