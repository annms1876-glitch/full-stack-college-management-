import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [adapter, config, migration, docs] = await Promise.all([
  read('../../shared/auth/clerk-supabase.js'),
  read('../../campuspulse-frontend/api/config.js'),
  read('../../supabase/migrations/202611260016_clerk_identity_compatibility.sql'),
  read('../../docs/backend/clerk-supabase-auth.md'),
]);

test('browser adapter uses Clerk supabase template and Supabase accessToken without Supabase sessions', () => {
  assert.match(adapter, /getToken\(\{ template: SUPABASE_JWT_TEMPLATE \}\)/);
  assert.match(adapter, /accessToken:\s*async/);
  assert.match(adapter, /persistSession:\s*false/);
  assert.match(adapter, /detectSessionInUrl:\s*false/);
  assert.doesNotMatch(adapter, /supabase\.auth\.(signIn|signUp|getSession)/);
});

test('runtime config exposes only publishable browser values', () => {
  assert.match(config, /process\.env\.SUPABASE_URL/);
  assert.match(config, /process\.env\.SUPABASE_PUBLISHABLE_KEY/);
  assert.match(config, /process\.env\.CLERK_PUBLISHABLE_KEY/);
  assert.doesNotMatch(config, /SERVICE_ROLE|CLERK_SECRET|JWT_SECRET/i);
});

test('migration maps Clerk subjects and rewrites every rebuilt policy through the helper', () => {
  assert.match(migration, /add column if not exists clerk_user_id text/);
  assert.match(migration, /create unique index if not exists profiles_clerk_user_id_uidx/);
  assert.match(migration, /create or replace function public\.current_profile_id\(\)/);
  assert.match(migration, /auth\.jwt\(\) ->> 'sub'/);
  assert.match(migration, /public\.current_profile_id\(\)/);
  assert.doesNotMatch(migration, /auth\.uid\(\)/);
  assert.match(migration, /drop policy if exists .* on storage\.objects;/);
  assert.match(migration, /create or replace function public\.admin_set_role/);
});

test('setup docs require the supabase JWT template and webhook mapping without credentials', () => {
  assert.match(docs, /template named exactly `supabase`/);
  assert.match(docs, /Clerk webhook/);
  assert.match(docs, /clerk_user_id/);
  assert.match(docs, /service-role key|service-role keys/i);
  assert.doesNotMatch(docs, /eyJ[A-Za-z0-9_-]{20,}\./);
});
