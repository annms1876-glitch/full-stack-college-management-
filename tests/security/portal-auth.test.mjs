import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [facultyAuth, adminAuth, facultyMain, adminApp, facultyVite, adminVite, facultyPackage, adminPackage, studentLogin] = await Promise.all([
  read('../../campuspulse-frontend/faculty-dashboard/src/portal-auth.js'),
  read('../../campuspulse-admin-dashboard/src/portal-auth.js'),
  read('../../campuspulse-frontend/faculty-dashboard/src/main.js'),
  read('../../campuspulse-admin-dashboard/src/app.js'),
  read('../../campuspulse-frontend/faculty-dashboard/vite.config.js'),
  read('../../campuspulse-admin-dashboard/vite.config.js'),
  read('../../campuspulse-frontend/faculty-dashboard/package.json'),
  read('../../campuspulse-admin-dashboard/package.json'),
  read('../../campuspulse-frontend/public/login-app.js'),
]);

for (const [label, source, role] of [['faculty', facultyAuth, 'faculty'], ['admin', adminAuth, 'admin']]) {
  test(`${label} portal uses password auth and gates rendering on the trusted profile role`, () => {
    assert.match(source, /auth\.signInWithPassword\(/);
    assert.match(source, /from\('profiles'\)\.select\('id, full_name, role'\)/);
    assert.ok(source.includes(role === 'faculty' ? 'data?.role !== expectedRole' : "data?.role !== 'admin'"));
    if (role === 'faculty') assert.match(source, /verifyRole\(client, data\.user, 'faculty'\)/);
    assert.match(source, /onAuthorized\(/);
    assert.match(source, /auth\.signOut\(/);
    assert.doesNotMatch(source, /user_metadata.*role|role.*user_metadata/);
  });
}

test('both Vite runtime config endpoints expose only the URL and publishable key', () => {
  for (const source of [facultyVite, adminVite]) {
    assert.match(source, /SUPABASE_URL/);
    assert.match(source, /SUPABASE_PUBLISHABLE_KEY/);
    assert.match(source, /Cache-Control.*no-store/);
    assert.doesNotMatch(source, /SERVICE_ROLE|service_role|SUPABASE_SECRET/);
  }
});

test('faculty and admin use distinct loopback ports and Vite 6', () => {
  assert.match(facultyPackage, /--host 127\.0\.0\.1 --port 3001/);
  assert.match(adminPackage, /--host 127\.0\.0\.1 --port 3002/);
  assert.match(facultyPackage, /"vite": "\^6\.4\.6"/);
  assert.match(adminPackage, /"vite": "\^6\.4\.6"/);
  assert.match(facultyMain, /startPortalAuth\(\{ onAuthorized:/);
  assert.match(adminApp, /startPortalAuth\(\{ onAuthorized:/);
});

test('student login offers the separate local faculty/admin portals after role verification', () => {
  assert.match(studentLogin, /role === "faculty" \? "3001" : "3002"/);
  assert.match(studentLogin, /sessions are not shared between apps/);
});
