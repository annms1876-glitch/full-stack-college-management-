import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [edge, shared, signature, migration, facultyAuth, adminAuth, studentApi] = await Promise.all([
  read('../../supabase/functions/get-signed-url/index.ts'),
  read('../../supabase/functions/_shared/supabase.ts'),
  read('../../supabase/functions/_shared/file-signature.ts'),
  read('../../supabase/migrations/202611260008_portal_wiring_and_signed_url.sql'),
  read('../../campuspulse-frontend/faculty-dashboard/src/portal-auth.js'),
  read('../../campuspulse-admin-dashboard/src/portal-auth.js'),
  read('../../campuspulse-frontend/public/api.js'),
]);

test('signed-URL endpoint authenticates the caller and throttles per user', () => {
  assert.match(edge, /startsWith\("Bearer "\)/);
  assert.match(edge, /await authenticatedUser\(caller\)/);
  assert.match(edge, /consumeLimit\(caller, "get-signed-url", 30, 60\)/);
  assert.match(shared, /trusted\.rpc\("consume_user_rate_limit"/);
  assert.match(migration, /'get-signed-url'/);
  assert.match(migration, /p_action = 'get-signed-url' and \(p_max_requests <> 30 or p_window_seconds <> 60\)/);
  assert.match(migration, /revoke all on function public\.consume_user_rate_limit\(uuid, text, integer, integer\) from public, anon, authenticated/);
});

test('ownership is proven with the caller JWT so RLS decides who may download', () => {
  assert.match(edge, /\.from\("assignment_submissions"\)[\s\S]*?\.eq\("file_path", objectPath\)/);
  assert.match(edge, /\.from\("posts"\)[\s\S]*?\.contains\("media_urls", \[objectPath\]\)/);
  assert.match(edge, /if \(!target\) return jsonResponse\(\{ error: "Forbidden" \}, 403\)/);
  assert.match(edge, /caller\.storage\.from\(target\.bucket\)\.createSignedUrl\(target\.path, expiresIn\)/);
  assert.doesNotMatch(edge, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edge, /Deliberately identical response/);
});

test('issued URLs are short lived, path-validated and bucket-restricted', () => {
  assert.match(edge, /const DEFAULT_TTL = 120;/);
  assert.match(edge, /const MIN_TTL = 30;/);
  assert.match(edge, /const MAX_TTL = 300;/);
  assert.match(edge, /Math\.min\(MAX_TTL, Math\.max\(MIN_TTL, Math\.trunc\(requestedTtl\)\)\)/);
  assert.match(edge, /objectPath\.includes\("\.\."\)/);
  assert.match(edge, /bucket !== "assignments" && bucket !== "post-media"/);
  assert.match(edge, /ASSIGNMENT_PATH/);
  assert.match(edge, /POST_MEDIA_PATH/);
});

test('magic bytes are verified before a URL is minted', () => {
  assert.match(signature, /0x25, 0x50, 0x44, 0x46, 0x2d/);
  assert.match(signature, /0x89, 0x50, 0x4e, 0x47/);
  assert.match(signature, /0xff, 0xd8, 0xff/);
  assert.match(signature, /Range: "bytes=0-15"/);
  assert.match(edge, /const sniffed = sniffMime\(head\)/);
  assert.match(edge, /!signatureMatchesMime\(sniffed, target\.mimeType\)/);
  assert.match(edge, /return jsonResponse\(\{ error: "File content does not match its declared type" \}, 422\)/);
  assert.match(migration, /submissions_mime_extension_match/);
  assert.match(migration, /submissions_path_extension_match/);
});

test('portals obtain private files only through storage-issued signed links', () => {
  assert.match(studentApi, /storage\.from\(bucket\)\.createSignedUrl\(path, 300\)/);
  assert.doesNotMatch(studentApi, /functions\.invoke\("get-signed-url"/);
  // links are minted by storage under the assignments policies, not by an Edge function
  for (const auth of [facultyAuth, adminAuth]) {
    assert.doesNotMatch(auth, /SUPABASE_SERVICE_ROLE_KEY|service_role/);
  }
});

test('local demo bypass still requires an explicit opt-in so real Clerk logins work', () => {
  for (const auth of [facultyAuth, adminAuth]) {
    assert.match(auth, /LOCAL_DEV_BYPASS && new URLSearchParams\(location\.search\)\.get\('demo'\) === '1'/);
    assert.doesNotMatch(auth, /client\.auth\.(signIn|signOut|getSession|getUser)/);
    assert.match(auth, /activeClerk\.client\.signIn\.create\(/);
    assert.match(auth, /sessionStorage\.getItem\(DEMO_KEY\) === '1'/);
    assert.match(auth, /if \(sessionStorage\.getItem\(DEMO_KEY\) === '1'\) \{ enterDemo\(\); return \}/);
    assert.match(auth, /if \(LOCAL_DEV_BYPASS && new URLSearchParams\(location\.search\)\.get\('demo'\) === '1'\) \{ enterDemo\(\); return \}/);
  }
});
