import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [inviteFunction, adminApp, adminAuth, studentLogin, studentLoginApp] = await Promise.all([
  read('../../supabase/functions/invite-user/index.ts'),
  read('../../campuspulse-admin-dashboard/src/app.js'),
  read('../../campuspulse-admin-dashboard/src/portal-auth.js'),
  read('../../campuspulse-frontend/public/screens/light/login.html'),
  read('../../campuspulse-frontend/public/login-app.js'),
]);

test('invitation endpoint authenticates the caller and checks the trusted admin profile role', () => {
  assert.match(inviteFunction, /callerClient\(auth\)/);
  assert.match(inviteFunction, /authenticatedUser\(caller\)/);
  assert.match(inviteFunction, /from\("profiles"\)[\s\S]*?select\("role"\)/);
  assert.match(inviteFunction, /actor\?\.role !== "admin"/);
  assert.match(inviteFunction, /consumeLimit\(caller, "invite-user", 5, 60\)/);
});

test('invitation endpoint permits only faculty/admin and never accepts a client-selected student role', () => {
  assert.match(inviteFunction, /new Set\(\["faculty", "admin"\]\)/);
  assert.match(inviteFunction, /inviteUserByEmail\(email/);
  assert.match(inviteFunction, /role_change_audit/);
  assert.match(inviteFunction, /deleteUser\(invitedUser\.id\)/);
  const metadata = inviteFunction.match(/const inviteOptions = \{([\s\S]*?)\n    \};/)?.[1] || '';
  assert.match(metadata, /full_name/);
  assert.doesNotMatch(metadata, /role\s*:/);
});

test('college directory and email-domain validation are server-side', () => {
  assert.match(inviteFunction, /body\.action === "list_colleges"/);
  assert.match(inviteFunction, /from\("colleges"\)/);
  assert.match(inviteFunction, /emailDomain !== collegeDomain/);
  assert.match(inviteFunction, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(adminApp, /SUPABASE_SERVICE_ROLE_KEY|service_role|SUPABASE_SECRET/);
});

test('admin UI offers only faculty/admin invitations and rejects anonymous demo mode', () => {
  assert.match(adminApp, /functions\.invoke\('invite-user'/);
  assert.match(adminApp, /value="faculty"/);
  assert.match(adminApp, /value="admin"/);
  assert.match(adminApp, /portalAuth\?\.demo/);
  assert.match(adminAuth, /data\?\.role !== 'admin'/);
});

test('student signup remains public and role-safe while anonymous student login is absent', () => {
  assert.match(studentLogin, /data-auth-tab="signup"/);
  assert.match(studentLoginApp, /api\.signUp\(\{ email:.*fullName:/);
  assert.doesNotMatch(studentLoginApp, /role\s*:/);
  assert.doesNotMatch(studentLogin, /student-anonymous-demo|Continue as anonymous demo/i);
});
