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
if (!['localhost', '127.0.0.1', '::1'].includes(host)) throw new Error('Demo seeding is restricted to localhost/127.0.0.1/::1. Remote Supabase projects are not supported.');
if (!serviceKey) throw new Error('Set SUPABASE_SERVICE_ROLE_KEY from `supabase status -o env`; never commit or expose it.');

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const text = await response.text(); let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed (${response.status}): ${body?.msg || body?.message || body?.error_description || text}`);
  return body;
}
async function rest(table, params = '', options = {}) { return request(`/rest/v1/${table}${params}`, options); }
async function upsert(table, rows, onConflict) {
  return rest(table, `?on_conflict=${encodeURIComponent(onConflict)}`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(rows) });
}

const college = (await upsert('colleges', [{ name: 'CampusPulse Demo College', domain: 'campuspulse.test' }], 'domain'))[0];
if (!college?.id) throw new Error('Could not create or find demo college.');
const listing = await request('/auth/v1/admin/users?page=1&per_page=1000');
const users = Array.isArray(listing) ? listing : listing?.users || [];
const byRole = {};
for (const account of accounts) {
  const prior = users.find(user => user.email?.toLowerCase() === account.email.toLowerCase());
  const payload = { email: account.email, password: account.password, email_confirm: true, user_metadata: { full_name: account.name, college_id: college.id } };
  const user = prior ? await request(`/auth/v1/admin/users/${encodeURIComponent(prior.id)}`, { method: 'PUT', body: JSON.stringify(payload) }) : await request('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify(payload) });
  const id = user?.id || user?.user?.id; if (!id) throw new Error(`Supabase did not return a user id for ${account.email}.`);
  await rest('profiles', `?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ role: account.role, college_id: college.id, full_name: account.name }) });
  byRole[account.role] = id;
  console.log(`Seeded ${account.role}: ${account.email}`);
}

const facultyId = byRole.faculty; const studentId = byRole.student; const adminId = byRole.admin;
const courses = await upsert('courses', [
  { college_id: college.id, faculty_id: facultyId, code: 'CS301', title: 'Data Structures & Algorithms', term: 'Semester V' },
  { college_id: college.id, faculty_id: facultyId, code: 'CS405', title: 'Database Management Systems', term: 'Semester V' },
], 'college_id,code,term');
const course = courses.find(c => c.code === 'CS301') || courses[0];
if (!course?.id) throw new Error('Could not create demo course.');
await upsert('course_enrollments', [{ course_id: course.id, student_id: studentId, status: 'active' }], 'course_id,student_id');
const notice = await rest('notices', `?college_id=eq.${college.id}&title=eq.${encodeURIComponent('Welcome to the CampusPulse demo')}&select=id`);
if (!notice.length) await rest('notices', '', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ college_id: college.id, author_id: adminId, title: 'Welcome to the CampusPulse demo', body: 'This notice is persisted in Supabase and visible to the demo college.', audience: 'everyone', published_at: new Date().toISOString() }) });
const assignment = await rest('assignments', `?course_id=eq.${course.id}&title=eq.${encodeURIComponent('AVL Tree Rotations')}&select=id`);
if (!assignment.length) await rest('assignments', '', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ course_id: course.id, title: 'AVL Tree Rotations', description: 'Implement insertion and deletion and explain each balancing rotation.', due_at: new Date(Date.now() + 7 * 86400000).toISOString(), max_points: 100, allow_late: false, created_by: facultyId }) });
console.log('Seeded college, courses, enrollment, notice, and assignment idempotently.');
