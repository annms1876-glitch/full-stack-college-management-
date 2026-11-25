# CampusPulse storage security audit

**Status update (remediation N4):** a signed-URL endpoint now exists at `supabase/functions/get-signed-url/` with JWT verification, RLS-proofed ownership lookup, a 30/minute per-user throttle, a 30–300 second TTL clamp, strict bucket/path validation, and a ranged magic-byte check of the stored object before signing. The audit findings below describe the pre-implementation state and remain the test checklist for that endpoint.

**Scope:** Static review of `supabase/migrations/202611260004_storage_buckets_and_policies.sql`, the relevant authorization helpers and table constraints in migrations `202611260001` and `202611260002`, and `docs/backend/storage.md`. The repository contains no application storage SDK implementation or signed-URL endpoint to inspect. No live Supabase project was available, so policy execution, runtime name normalization, and signed-URL issuance were not exercised.

## Verdict

**PASS — no high or critical source-level finding remains in the reviewed migration and documentation.** The avatar bucket is public by design but its declared MIME allowlist is restricted to PNG/JPEG. Assignment policy paths align with the documented SDK call when the explicit `assignments/` segment is included in the upload path. The private-bucket authorization predicates scope access to post visibility or recorded submissions and course faculty. This is a static verdict, not a certification of deployed configuration or an unreviewed endpoint.

## Review results

### Avatars: public reads and uploads

`avatars` is configured `public=true`, and `avatars_public_read` allows SELECT for every object in that bucket. Public unauthenticated reads are intentional for profile images; the bucket allowlist contains only `image/png` and `image/jpeg` (migration lines 7–9). Public visibility is not limited by extension, user folder, or caller, so this bucket must contain only material intended for public distribution.

Authenticated insert and update require the first folder to equal `auth.uid()` and an anchored one-folder/filename shape; the filename allows only ASCII letters/digits, dot, underscore, and hyphen and the predicate rejects `..`. Update's USING clause is folder-scoped, and WITH CHECK validates the destination shape and owner. Delete is likewise limited to the caller's own first folder. No cross-user avatar write, overwrite, or delete is evident in the predicates.

The allowlist is based on declared MIME metadata, not file-byte inspection. A client can label non-image bytes as PNG or JPEG, so image-only MIME configuration mitigates accidental/declared non-image uploads but **does not mitigate MIME spoofing**. This remains a **MEDIUM** content-validation limitation. The backend documentation acknowledges it and recommends trusted byte-signature inspection, safe parsing/scanning, and avoiding inline active content; no such trusted scanning/quarantine implementation is present in the reviewed storage policies or frontend. Do not treat allowed MIME metadata as proof that an object is a safe image.

### Exact assignment object-name contract

The documented SDK call is `supabase.storage.from('assignments').upload('assignments/<course>/<assignment>/<student>/<uuid.ext>', file)`. The bucket ID is `assignments`; it is not automatically prepended to the supplied object path. The explicit first `assignments/` segment in the SDK path is therefore part of the bucket-relative object name, and the policy's `storage.objects.name` pattern expects precisely that literal prefix followed by course UUID, assignment UUID, student UUID, and filename. `assignment_submissions.file_path` must store that same exact object name, with no bucket name added by application code. This contract is internally consistent in the current migration and docs; omitting or duplicating the explicit prefix fails the anchored policy and exact-row match.

Assignment INSERT checks all four path components, requires the student segment to equal `auth.uid()`, and requires the path's assignment/course pair to correspond to an active enrollment by that student. SELECT requires an exact `assignment_submissions.file_path = storage.objects.name` row and allows only its student or faculty authorized for the assignment's course. Faculty authorization comes from `is_faculty_of_course(course_id)`, which requires the caller to be the course's faculty and in the course's college. A guessed path, another student's path, another course's faculty role, or an orphan without a submission row does not satisfy these predicates, assuming the reviewed helper/table definitions are deployed as written.

The repository documents a server-side signed-URL pattern, not an implemented endpoint. For assignments it requires validating the caller, canonical recorded submission path, and student-or-course-faculty scope before issuing a short-lived URL (60–300 seconds suggested); it warns that a signed URL is a bearer capability and remains usable until expiry despite later policy changes. For post media it requires current `can_view_post` visibility before signing. These are sound documented rules, but enforcement cannot be verified because no signing code is included. Prefer policy-checked authenticated Storage downloads where possible; never let an untrusted caller choose arbitrary bucket/path under a service-role key.

### Post media and cross-user boundaries

`post-media` is private. SELECT requires a UUID first path segment and `can_view_post(post_id)`, which checks the post's current public, same-college, or author-only visibility. Insert/update/delete are scoped to a post whose `author_id` is the caller; insert and update additionally validate the two-segment safe path. No cross-user read/write/delete bypass is apparent from these predicates. Storage names are literal object keys; the anchored write regexes and explicit `..` rejection prevent ordinary traversal-shaped write names. Runtime handling of encoded separators or normalization still needs integration testing.

### Assignment deletion, updates, and object lifecycle

Assignment object DELETE requires an exact recorded submission path, the caller as student, `status='submitted'`, and strict `now() < due_at`. At the deadline and after it, deletion is denied; `allow_late` does not extend this window. No faculty delete policy exists. UPDATE is restricted to an already recorded submission in a course for which the caller is faculty, and the destination must remain the exact assignment/student/path recorded in the submission. This allows authorized course faculty to replace bytes at that recorded path; the database's stored MIME and size metadata are not automatically changed by a Storage object update.

Assignment reads require a submission row, so failed upload-then-row-insert flows can leave private, ordinarily unreadable orphan objects. The migration defines no cleanup job/policy. Cleanup must be performed by a trusted process that validates the exact intended path and does not expose a general user-controlled service-role delete primitive.

### MIME and maximum size

Each bucket has a 26,214,400-byte (25 MiB) Storage bucket limit. Avatar MIME types are PNG/JPEG only; the private buckets list PDF, DOC, DOCX, PNG, JPEG, ZIP, and ZIP-compressed MIME types. The submission table's `file_size` and `mime_type` constraints are metadata checks and do not inspect actual bytes. The Storage bucket limit is the primary bound for ordinary Storage uploads; service-role/server upload paths and any proxy must independently enforce byte limits because they may bypass client RLS. Do not treat client-reported `file_size` as actual object size.

## Findings

- **MEDIUM — MIME spoofing/content validation is not mitigated by MIME allowlists.** A caller can submit arbitrary bytes while declaring `image/png` or another allowed MIME type. The configuration prevents unsupported declared MIME types and limits the public avatar bucket to declared PNG/JPEG, but does not validate byte signatures or content safety. The docs acknowledge this and recommend trusted scanning/parsing; that recommendation is not an implemented control in the reviewed code. Risk depends on downstream rendering and parsing. Keep untrusted objects out of inline active-content contexts and add trusted byte-level validation before treating uploads as verified images/documents.
- **LOW — orphaned assignment objects can accumulate.** If object upload succeeds but row insertion fails, the object is private and fails the submission-row SELECT predicate, but no cleanup mechanism is defined in the migration. This is a storage-cost/availability concern, not a demonstrated confidentiality bypass.

No HIGH or CRITICAL finding was identified in the reviewed source. Cross-user access, faculty scope, path shape, and strict object-delete deadline predicates are correctly constrained at source level, subject to runtime validation.

## Verification still needed

Before release, exercise the migration in a disposable Supabase project. Upload using the exact SDK call above and verify the resulting `storage.objects.name` and saved `file_path` are exactly `assignments/<course>/<assignment>/<student>/<uuid.ext>`. Confirm valid owner uploads work and omitted/duplicated prefix, malformed UUIDs, mismatched assignment/course, another student's UUID, inactive enrollment, and another course's faculty are denied. Test anonymous public avatar reads and uploads with unsupported declared MIME, then demonstrate that allowed MIME metadata does not prove byte content. Verify the 25 MiB boundary, cross-user post and assignment reads/writes, delete immediately before/at/after `due_at`, and signed-URL caller/path/expiry handling. Confirm signed-URL generation is restricted to the documented canonical checks and uses short expiries. The migration has not been applied to or tested against a live project.