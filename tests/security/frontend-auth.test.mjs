import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [server, api, login, loginApp, seed] = await Promise.all([
  read('../../campuspulse-frontend/server.js'),
  read('../../campuspulse-frontend/public/api.js'),
  read('../../campuspulse-frontend/public/screens/light/login.html'),
  read('../../campuspulse-frontend/public/login-app.js'),
  read('../../scripts/seed-demo-users.mjs'),
]);

test('landing page and student feed use separate routes', () => {
  assert.match(server, /"\/": "\/home\.html"/);
  assert.match(server, /"\/feed": "\/screens\/light\/feed\.html"/);
});

test('login uses password auth and looks up a trusted profile role', () => {
  assert.match(loginApp, /api\.signIn\(/);
  assert.match(loginApp, /api\.profile\(user\.id\)/);
  assert.match(loginApp, /roleAfterAuth/);
  assert.match(loginApp, /location\.replace\("\/feed"\)/);
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
