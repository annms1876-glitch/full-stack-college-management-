import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [facultyData, facultyMain, adminData, adminApp, studentApi, studentApp, signedUrl, migration] = await Promise.all([
  read('../../campuspulse-frontend/faculty-dashboard/src/data.js'),
  read('../../campuspulse-frontend/faculty-dashboard/src/main.js'),
  read('../../campuspulse-admin-dashboard/src/data.js'),
  read('../../campuspulse-admin-dashboard/src/app.js'),
  read('../../campuspulse-frontend/public/api.js'),
  read('../../campuspulse-frontend/public/app.js'),
  read('../../supabase/functions/get-signed-url/index.ts'),
  read('../../supabase/migrations/202611260008_portal_wiring_and_signed_url.sql'),
]);

test('faculty portal reads and writes live coursework instead of mock arrays', () => {
  assert.match(facultyData, /from\('courses'\)[\s\S]*?\.eq\('faculty_id', profile\.id\)/);
  assert.match(facultyData, /from\('assignments'\)/);
  assert.match(facultyData, /from\('assignment_submissions'\)/);
  assert.match(facultyData, /from\('notices'\)/);
  assert.match(facultyData, /\.insert\(\{ title, body, audience, college_id: profile\.college_id, author_id: profile\.id \}\)/);
  assert.match(facultyData, /\.update\(\{ status: 'graded', grade, feedback \}\)/);
  assert.match(facultyMain, /loadFacultySnapshot\(portalAuth\.client, portalAuth\.profile\)/);
  assert.match(facultyMain, /publishAssignment\(portalAuth\.client/);
  assert.match(facultyMain, /publishNotice\(portalAuth\.client/);
  assert.match(facultyMain, /gradeSubmission\(portalAuth\.client/);
  assert.match(facultyMain, /requestSignedUrl\(portalAuth\.client, 'assignments'/);
  // The mock KPI/metric arrays that previously defined the dashboard are gone.
  assert.doesNotMatch(facultyMain, /value: '84\.6%'/);
  assert.doesNotMatch(facultyMain, /'Pending assignments', value: '08'/);
  assert.match(facultyMain, /const requireLive = \(\) =>/);
  assert.match(facultyMain, /Attendance is not part of the current schema/);
});

test('student portal loads enrolled courses, assignments and submissions from Supabase', () => {
  assert.match(studentApi, /myCourses: async \(\) =>/);
  assert.match(studentApi, /\.eq\("student_id", user\.id\)[\s\S]{0,40}?\.eq\("status", "active"\)/);
  assert.match(studentApi, /assignments: async \(\) =>/);
  assert.match(studentApi, /\.in\("course_id", courseIds\)/);
  assert.match(studentApi, /mySubmissions: async \(\) =>/);
  assert.match(studentApi, /storage\.from\("assignments"\)\.upload\(path, file/);
  assert.match(studentApi, /crypto\.randomUUID\(\)/);
  // Signed links come from storage under the assignments policies; the
  // get-signed-url Edge function was never deployed.
  assert.match(studentApi, /storage\.from\(bucket\)\.createSignedUrl\(path, 300\)/);
  assert.doesNotMatch(studentApi, /get-signed-url/);
  assert.match(studentApp, /if\(path\.endsWith\("\/feed"\)\)/);
  assert.match(studentApp, /await api\.notices\(6\)/);
  assert.match(studentApp, /data-notice-id="\$\{escapeHtml\(n\.id\)\}"/);
  assert.match(studentApp, /if\(path\.endsWith\("\/study"\)\)/);
  assert.match(studentApp, /await api\.submitAssignment\(\{assignment,courseId:form\.dataset\.courseId,file\}\)/);
  assert.match(studentApp, /api\.openSignedUrl\("assignments",submission\.file_path\)/);
  assert.match(studentApp, /Self-enrollment is disabled by policy/);
});

test('upload validation rejects mismatched magic bytes before any Storage write', () => {
  assert.match(studentApi, /import \{ validateUploadFile, UPLOAD_ALLOWLIST \} from "\/file-signature\.js"/);
  assert.match(studentApi, /const checked = await validateUploadFile\(file\)/);
  assert.match(studentApi, /if \(!checked\.ok\) throw new Error\(checked\.message\)/);
  const validateIndex = studentApi.indexOf('const checked = await validateUploadFile(file)');
  const uploadIndex = studentApi.indexOf('storage.from("assignments").upload(path');
  assert.ok(validateIndex >= 0 && uploadIndex > validateIndex, 'signature validation must precede the upload');
});

test('admin portal manages notices, courses, enrolment and roles live', () => {
  assert.match(adminData, /from\('notices'\)/);
  assert.match(adminData, /from\('courses'\)/);
  assert.match(adminData, /from 'course_enrollments'\)|from\('course_enrollments'\)/);
  // Role changes run through the admin_set_role RPC, which re-checks the caller
  // and the target's college on the server. The grant-role and invite-user Edge
  // functions were never deployed, so the console must not call them.
  assert.match(adminData, /rpc\('admin_set_role'/);
  assert.doesNotMatch(adminData, /functions\.invoke\('grant-role'/);
  assert.doesNotMatch(adminData, /functions\.invoke\('invite-user'/);
  assert.match(adminData, /from\('colleges'\)/);
  assert.match(adminApp, /loadAdminSnapshot\(portalAuth\.client\)/);
  assert.match(adminApp, /publishNotice\(portalAuth\.client, portalAuth\.profile/);
  assert.match(adminApp, /createCourse\(portalAuth\.client, portalAuth\.profile/);
  assert.match(adminApp, /enrolStudent\(portalAuth\.client/);
  assert.match(adminApp, /grantRole\(portalAuth\.client/);
  assert.match(adminApp, /renderNotices\(\)/);
  assert.match(adminApp, /renderCourses\(\)/);
  assert.match(adminApp, /renderAssignments\(\)/);
  assert.match(adminApp, /askAssistant\(portalAuth\.client, prompt\)/);
  // Sample datasets for the wired modules must no longer exist.
  assert.doesNotMatch(adminApp, /'notices-announcements': \{\s*\n\s*title: 'Notices & Announcements'/);
  assert.doesNotMatch(adminApp, /'course-information': \{\s*\n\s*title: 'Course Information'/);
});

test('browser bundles never contain a service-role key or provider secret', () => {
  for (const source of [facultyData, facultyMain, adminData, adminApp, studentApi, studentApp]) {
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET|service_role\s*[:=]\s*['"]ey/);
  }
  assert.match(signedUrl, /SUPABASE_SERVICE_ROLE_KEY|callerClient/);
});

test('signed-URL issuance and enrolment policies are additive and least privilege', () => {
  assert.match(migration, /-- Additive, least-privilege changes only/);
  assert.match(signedUrl, /consumeLimit\(caller, "get-signed-url", 30, 60\)/);
  assert.match(signedUrl, /\.eq\("file_path", objectPath\)/);
  assert.match(signedUrl, /createSignedUrl\(target\.path, expiresIn\)/);
});
