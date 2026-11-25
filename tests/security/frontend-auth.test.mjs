import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [server, api, login, darkLogin, loginApp, seed, studentApp] = await Promise.all([
  read('../../campuspulse-frontend/server.js'),
  read('../../campuspulse-frontend/public/api.js'),
  read('../../campuspulse-frontend/public/screens/light/login.html'),
  read('../../campuspulse-frontend/public/screens/dark/login.html'),
  read('../../campuspulse-frontend/public/login-app.js'),
  read('../../scripts/seed-demo-users.mjs'),
  read('../../campuspulse-frontend/public/app.js'),
]);

test('landing page and student feed use separate routes', () => {
  assert.match(server, /"\/": "\/home\.html"/);
  assert.match(server, /"\/feed": "\/screens\/light\/feed\.html"/);
});

test('login uses password auth and looks up a trusted profile role', () => {
  assert.match(loginApp, /api\.signIn\(/);
  assert.match(loginApp, /api\.profile\(user\.id\)/);
  assert.match(loginApp, /roleAfterAuth/);
  assert.match(loginApp, /student: "\/feed", faculty: "\/faculty\/", admin: "\/admin\/"/);
  assert.match(loginApp, /location\.replace\(destinations\[role\]\)/);
  assert.doesNotMatch(loginApp, /user_metadata\??\.role|user\.email.*(?:faculty|admin)/);
  assert.doesNotMatch(login, /OTP Verification|Verify OTP|Get OTP/);
});

test('signup never sends a client-selected faculty/admin role', () => {
  assert.match(loginApp, /api\.signUp\(\{ email:.*fullName:/);
  assert.doesNotMatch(loginApp, /role\s*:/);
  assert.match(api, /auth\.signUp\(/);
  assert.doesNotMatch(api.match(/signUp:.*\n/)?.[0] || '', /role/);
});

test('password recovery invokes Supabase reset email and update endpoints', () => {
  assert.match(api, /resetPasswordForEmail/);
  assert.match(api, /auth\.updateUser\(\{ password \}\)/);
  assert.match(loginApp, /PASSWORD_RECOVERY/);
});

test('demo credentials are served and seeded only behind loopback development guards', () => {
  assert.match(server, /CAMPUSPULSE_DEMO_MODE === "true"/);
  assert.match(server, /process\.env\.NODE_ENV !== "production"/);
  assert.match(server, /DEMO_MODE_ENABLED \? "127\.0\.0\.1"/);
  assert.match(server, /\["localhost", "127\.0\.0\.1", "::1"\]/);
  assert.match(server, /if \(!DEMO_MODE_ENABLED\)/);
  assert.match(seed, /CAMPUSPULSE_ALLOW_DEMO_SEED === 'true'/);
  assert.match(seed, /NODE_ENV === 'production'/);
  assert.match(seed, /\['localhost', '127\.0\.0\.1', '::1'\]/);
  assert.match(seed, /SUPABASE_SERVICE_ROLE_KEY/);
});

test('student login has no anonymous option and the student app always initializes Supabase auth', () => {
  assert.doesNotMatch(login, /student-anonymous-demo|Continue as anonymous demo/i);
  assert.doesNotMatch(darkLogin, /anonymous demo|OTP Verification|btn-login-submit|btn-signup-submit/i);
  assert.doesNotMatch(loginApp, /student-anonymous-demo|campuspulse:student-demo/);
  assert.doesNotMatch(studentApp, /isStudentDemo|STUDENT_DEMO_KEY|campuspulse:student-demo|ANONYMOUS DEMO/);
  assert.match(studentApp, /const \{api,supabase\}=await import\("\/api\.js"\)/);
  assert.match(studentApp, /api\.onAuth\(/);
  assert.match(studentApp, /if\(path\.endsWith\("\/faculty"\)\)/);
  assert.match(studentApp, /if\(path\.endsWith\("\/clubs"\)\)/);
  assert.match(studentApp, /if\(\["\/profile","\/study"\]/);
});

test('all student sign-in paths use the trusted profile-role flow without legacy bypasses', () => {
  assert.match(darkLogin, /href="\/login"/);
  assert.match(loginApp, /roleAfterAuth/);
  assert.doesNotMatch(studentApp, /api\.signIn\(|api\.signUp\(|btn-login-submit|btn-signup-submit/);
  assert.ok(server.includes('if (!/^\\/screens\\/(?:light|dark)\\/login\\.html$/.test(mappedPath))'));
});
