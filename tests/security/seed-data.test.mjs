import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const seed = await read('../../scripts/seed-demo-users.mjs');
const accounts = JSON.parse(await readFile(resolve('scripts/demo-accounts.json'), 'utf8'));

test('seed keeps its loopback and explicit opt-in guards', () => {
  assert.match(seed, /CAMPUSPULSE_ALLOW_DEMO_SEED === 'true'/);
  assert.match(seed, /NODE_ENV === 'production'/);
  assert.match(seed, /\['localhost', '127\.0\.0\.1', '::1'\]/);
  assert.match(seed, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(seed, /Remote Supabase projects are not supported/);
});

test('seed creates a demo college whose domain matches the demo accounts', () => {
  const college = seed.match(/const COLLEGE = \{([\s\S]*?)\};/)?.[1] || '';
  const domain = college.match(/domain: '([^']+)'/)?.[1];
  assert.equal(domain, 'campuspulse.test');
  for (const account of accounts) {
    assert.ok(account.email.endsWith(`@${domain}`), `${account.email} must match the seeded college domain`);
  }
  assert.match(seed, /from\(|`\/rest\/v1\/colleges\?domain=eq\./);
});

test('seed populates roles, courses, enrolments, notices and assignments idempotently', () => {
  assert.match(seed, /\/rest\/v1\/profiles\?id=eq\./);
  assert.match(seed, /college_id: college\.id/);
  assert.match(seed, /\/rest\/v1\/courses\?college_id=eq\./);
  assert.match(seed, /const COURSES = \[/);
  assert.match(seed, /\/rest\/v1\/course_enrollments\?on_conflict=course_id,student_id/);
  assert.match(seed, /const NOTICES = \[/);
  assert.match(seed, /author_id: admin\.id/);
  assert.match(seed, /const ASSIGNMENTS = \[/);
  assert.match(seed, /created_by: faculty\.id/);
  assert.match(seed, /due_at: dayFromNow\(assignment\.dueInDays\)/);
  assert.match(seed, /select=id,code,title,term/);
  assert.match(seed, /if \(existing\)/);
});

test('seed never prints the service-role key or writes to a remote host', () => {
  assert.doesNotMatch(seed, /console\.log\([^)]*serviceKey/);
  assert.doesNotMatch(seed, /console\.log\([^)]*SERVICE_ROLE/);
  assert.match(seed, /if \(!serviceKey\) throw new Error/);
});
