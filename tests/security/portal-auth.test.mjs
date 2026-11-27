import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [facultyAuth, adminAuth, facultyMain, adminApp, facultyVite, adminVite, facultyPackage, adminPackage, studentLogin, studentApi, studentServer, rootConfig, rootApi] = await Promise.all([
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
  read('../../vercel.json'),
  read('../../api/config.js'),
]);
const adminData = await read('../../campuspulse-admin-dashboard/src/data.js');

for (const [label, source, role] of [['faculty', facultyAuth, 'faculty'], ['admin', adminAuth, 'admin']]) {
  test(`${label} portal uses Clerk password auth and gates rendering on the trusted profile role`, () => {
    assert.match(source, /client\.signIn\.create\(/);
    assert.match(source, /createClerkSupabaseClient/);
    // college_id and bio ride along so college-scoped writes and the profile form work.
    assert.match(source, /from\('profiles'\)\.select\('id, full_name, role[^']*'\)/);
    assert.match(source, /eq\('clerk_user_id', user\.id\)/);
    assert.ok(source.includes(role === 'faculty' ? 'data?.role !== expectedRole' : "data?.role !== 'admin'"));
    assert.match(source, /onAuthorized\(/);
    assert.match(source, /setActive\(\{ session: result\.createdSessionId \}\)/);
    // A failed role check must clear the Clerk session, without being able to hang the form.
    assert.match(source, /withTimeout\(attemptedClerk\.signOut\(\),/);
    assert.match(source, /withTimeout\(\s*client\s*\.from\('profiles'\)|client\.from\('profiles'\)\.select\('id, full_name, role/);
    assert.match(source, /import\.meta\.env\.DEV/);
    assert.match(source, /LOCAL_DEV_BYPASS/);
    assert.doesNotMatch(source, /user_metadata.*role|role.*user_metadata/);
  });

  test(`${label} anonymous demo bypasses Supabase and is clearly marked`, () => {
    assert.match(source, /id="portal-anonymous-demo"/);
    assert.match(source, /client: null, demo: true/);
    assert.match(source, /No Supabase session, live records, or backend changes/);
    assert.match(source, /if \(sessionStorage\.getItem\(DEMO_KEY\) === '1'\) \{ enterDemo\(\); return \}/);
    assert.match(source, /if \(LOCAL_DEV_BYPASS && new URLSearchParams\(location\.search\)\.get\('demo'\) === '1'\) \{ enterDemo\(\); return \}/);
  });
}

test('both Vite runtime config endpoints expose only Clerk and Supabase publishable values', () => {
  for (const source of [facultyVite, adminVite]) {
    assert.match(source, /CLERK_PUBLISHABLE_KEY/);
    assert.match(source, /SUPABASE_URL/);
    assert.match(source, /SUPABASE_PUBLISHABLE_KEY/);
    assert.match(source, /Cache-Control.*no-store/);
    assert.doesNotMatch(source, /SERVICE_ROLE|service_role|SUPABASE_SECRET/);
  }
});

test('faculty and admin local Vite development remains available with existing role gates', () => {
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

test('student login routes only from the verified profiles.role to same-origin portal routes', () => {
  assert.match(studentLogin, /const profile = await api\.currentUser\(\)/);
  assert.match(studentLogin, /const destinations = \{ student: "\/feed", faculty: "\/faculty\/", admin: "\/admin\/" \}/);
  assert.match(studentLogin, /location\.replace\(destinations\[role\]\)/);
  assert.doesNotMatch(studentLogin, /user_metadata\??\.role|user\.email.*(?:faculty|admin)|portalUrls/);
  assert.doesNotMatch(studentApi, /facultyPortalUrl|adminPortalUrl/);
  assert.doesNotMatch(studentServer, /FACULTY_PORTAL_URL|ADMIN_PORTAL_URL/);
});

test('same-origin portal subpaths are built, served locally, and rewritten without catching API/assets', () => {
  assert.match(facultyMain, /import\.meta\.env\.BASE_URL/);
  assert.match(adminApp, /import\.meta\.env\.BASE_URL/);
  assert.match(studentServer, /PORTAL_DIST_DIR/);
  assert.match(studentServer, /if \(!portal && path\.extname\(filePath\) === "\.html"\)/);
  assert.match(rootApi, /campuspulse-frontend\/api\/config\.js/);
  assert.match(rootConfig, /"source": "\/api\/config"/);
  assert.match(rootConfig, /"source": "\/faculty\/attendance"/);
  assert.match(rootConfig, /"source": "\/admin\/student-records"/);
  assert.doesNotMatch(rootConfig, /"source": "\/(?:faculty|admin)\/\*"/);
});

test('production preview demo is explicit and keeps the sample enrolment join valid', () => {
  assert.match(facultyAuth, /import\.meta\.env\.DEV \|\| new URLSearchParams\(location\.search\)\.get\('demo'\) === '1'/);
  assert.match(adminAuth, /import\.meta\.env\.DEV \|\| new URLSearchParams\(location\.search\)\.get\('demo'\) === '1'/);
  assert.match(adminData, /student_id: 'demo-student-1'/);
  assert.doesNotMatch(adminData, /student_id: 'deme-1'/);
});
