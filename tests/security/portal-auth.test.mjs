import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [facultyAuth, adminAuth, facultyMain, adminApp, facultyVite, adminVite, facultyPackage, adminPackage, studentLogin, studentApi, studentServer] = await Promise.all([
  read('../../campuspulse-frontend/faculty-dashboard/src/portal-auth.js'),
  read('../../campuspulse-admin-dashboard/src/portal-auth.js'),
  read('../../campuspulse-frontend/faculty-dashboard/src/main.js'),
  read('../../campuspulse-admin-dashboard/src/app.js'),
  read('../../campuspulse-frontend/faculty-dashboard/vite.config.js'),
  read('../../campuspulse-admin-dashboard/vite.config.js'),
  read('../../campuspulse-frontend/faculty-dashboard/package.json'),
  read('../../campuspulse-admin-dashboard/package.json'),
  read('../../campuspulse-frontend/public/login-app.js'),
  read('../../campuspulse-frontend/public/api.js'),
  read('../../campuspulse-frontend/server.js'),
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

  test(`${label} anonymous demo bypasses Supabase and is clearly marked`, () => {
    assert.match(source, /id="portal-anonymous-demo"/);
    assert.match(source, /client: null, demo: true/);
    assert.match(source, /No Supabase session, live records, or backend changes/);
    const demoCheck = source.indexOf("if (sessionStorage.getItem(DEMO_KEY) === '1')");
    const configFetch = source.indexOf("await fetch('/api/config'");
    assert.ok(demoCheck >= 0 && configFetch > demoCheck, 'demo session check must happen before Supabase runtime config is fetched');
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
  assert.match(facultyMain, /sessionStorage\.removeItem\('campuspulse:faculty-demo'\)/);
  assert.match(adminApp, /sessionStorage\.removeItem\('campuspulse:admin-demo'\)/);
  assert.match(facultyMain, /demo-access-banner/);
  assert.match(adminApp, /demo-access-banner/);
});

test('student login offers configured faculty/admin portal URLs after role verification', () => {
  assert.match(studentLogin, /role === "faculty" \? portalUrls\.faculty : portalUrls\.admin/);
  assert.match(studentApi, /faculty: config\.facultyPortalUrl \|\| "http:\/\/127\.0\.0\.1:3001\/"/);
  assert.match(studentApi, /admin: config\.adminPortalUrl \|\| "http:\/\/127\.0\.0\.1:3002\/"/);
  assert.match(studentServer, /FACULTY_PORTAL_URL/);
  assert.match(studentServer, /ADMIN_PORTAL_URL/);
  assert.match(studentServer, /url\.protocol !== "http:" && url\.protocol !== "https:"/);
  assert.match(studentLogin, /sessions are not shared between apps/);
});
