import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const accounts = JSON.parse(await readFile(resolve(root, 'scripts/demo-accounts.json'), 'utf8'));
const base = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const enabled = process.env.CAMPUSPULSE_ALLOW_DEMO_SEED === 'true';

if (!enabled) throw new Error('Refusing to seed demo users. Set CAMPUSPULSE_ALLOW_DEMO_SEED=true for an intentional local seed.');
if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed demo users when NODE_ENV=production.');
if (!base) throw new Error('Set SUPABASE_URL to your local Supabase URL.');
const host = new URL(base).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
  throw new Error('Demo seeding is restricted to localhost/127.0.0.1/::1. Remote Supabase projects are not supported.');
}
if (!serviceKey) throw new Error('Set SUPABASE_SERVICE_ROLE_KEY from `supabase status -o env`; never commit or expose it.');

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed (${response.status}): ${body?.msg || body?.message || body?.error_description || text}`);
  return body;
}

const listing = await request('/auth/v1/admin/users?page=1&per_page=1000');
const users = Array.isArray(listing) ? listing : listing?.users || [];
for (const account of accounts) {
  const prior = users.find(user => user.email?.toLowerCase() === account.email.toLowerCase());
  const user = prior
    ? await request(`/auth/v1/admin/users/${encodeURIComponent(prior.id)}`, { method: 'PUT', body: JSON.stringify({ password: account.password, email_confirm: true, user_metadata: { full_name: account.name } }) })
    : await request('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email: account.email, password: account.password, email_confirm: true, user_metadata: { full_name: account.name } }) });
  const id = user?.id || user?.user?.id;
  if (!id) throw new Error(`Supabase did not return a user id for ${account.email}.`);
  const profileRows = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id,role`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ role: account.role, full_name: account.name }),
  });
  if (!Array.isArray(profileRows) || profileRows[0]?.role !== account.role) {
    throw new Error(`Could not verify the ${account.role} profile for ${account.email}. Apply the CampusPulse migrations first.`);
  }
  console.log(`Seeded ${account.role}: ${account.email}`);
}
console.log('Local demo accounts are ready. The role values were assigned with the local service-role key.');
