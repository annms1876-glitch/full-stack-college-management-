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
const get = (path) => request(path);
const post = (path, payload, prefer = 'return=representation') => request(path, { method: 'POST', headers: { Prefer: prefer }, body: JSON.stringify(payload) });
const patch = (path, payload) => request(path, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });

// ---------------------------------------------------------------------------
// Demo data contract. Everything here is idempotent: natural keys are looked up
// before insert so re-running the seed never duplicates courses, notices or
// assignments, and UUIDs stay stable for the running demo.
// ---------------------------------------------------------------------------
const COLLEGE = { name: 'CampusPulse Demo Institute', domain: 'campuspulse.test' };
const TERM = 'Odd 2026-27';
const COURSES = [
  { code: 'CS301', title: 'Data Structures & Algorithms' },
  { code: 'CS405', title: 'Database Management Systems' },
  { code: 'CS212', title: 'Operating Systems' },
];
const NOTICES = [
  {
    title: 'End-semester examination schedule published',
    body: 'The odd-semester examination schedule is now available. Check your course pages for hall and timing details, and carry your physical ID card to every session.',
    audience: 'everyone',
  },
  {
    title: 'Assignment submission window: 25 MiB limit',
    body: 'Coursework uploads accept PDF, DOC, DOCX, PNG, JPEG and ZIP files up to 25 MiB. Submit from the Study Hub; late work is only accepted when your faculty member allowed it.',
    audience: 'students',
  },
];
const ASSIGNMENTS = [
  {
    code: 'CS301',
    title: 'AVL tree rotations lab',
    description: 'Implement insertion and deletion in an AVL tree, then document every rotation performed and the resulting search complexity. Submit source plus a short rotation trace.',
    dueInDays: 9,
    maxPoints: 100,
    allowLate: false,
  },
  {
    code: 'CS405',
    title: 'Normalisation and indexing report',
    description: 'Given the supplied schema, explain your 3NF decomposition and propose indexes for the five most frequent queries.',
    dueInDays: 16,
    maxPoints: 50,
    allowLate: true,
  },
];

const dayFromNow = (days) => {
  const date = new Date(Date.now() + days * 864e5);
  date.setUTCHours(18, 0, 0, 0);
  return date.toISOString();
};

// 1. Demo Auth users, with roles verified through public.profiles afterwards.
const listing = await request('/auth/v1/admin/users?page=1&per_page=1000');
const users = Array.isArray(listing) ? listing : listing?.users || [];
const seeded = {};
for (const account of accounts) {
  const prior = users.find(user => user.email?.toLowerCase() === account.email.toLowerCase());
  const user = prior
    ? await request(`/auth/v1/admin/users/${encodeURIComponent(prior.id)}`, { method: 'PUT', body: JSON.stringify({ password: account.password, email_confirm: true, user_metadata: { full_name: account.name } }) })
    : await request('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email: account.email, password: account.password, email_confirm: true, user_metadata: { full_name: account.name } }) });
  const id = user?.id || user?.user?.id;
  if (!id) throw new Error(`Supabase did not return a user id for ${account.email}.`);
  seeded[account.role] = { id, email: account.email, name: account.name };
}

// 2. The demo college. Student signup validates a matching public.colleges row,
//    so this must exist before any college-scoped demo record.
let [college] = await get(`/rest/v1/colleges?domain=eq.${encodeURIComponent(COLLEGE.domain)}&select=id,name,domain`);
if (!college) {
  [college] = await post('/rest/v1/colleges?on_conflict=domain', COLLEGE, 'resolution=merge-duplicates,return=representation');
}
if (!college?.id) throw new Error('The demo college row could not be created. Apply the CampusPulse migrations first.');
console.log(`Demo college ready: ${college.name} (${college.domain})`);

// 3. Attach every demo profile to the college and verify its trusted role.
for (const account of accounts) {
  const { id } = seeded[account.role];
  const rows = await patch(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id,role,college_id`, {
    role: account.role,
    full_name: account.name,
    college_id: college.id,
  });
  if (!Array.isArray(rows) || rows[0]?.role !== account.role || rows[0]?.college_id !== college.id) {
    throw new Error(`Could not verify the ${account.role} profile for ${account.email}. Apply the CampusPulse migrations first.`);
  }
  console.log(`Seeded ${account.role}: ${account.email}`);
}

const faculty = seeded.faculty;
const student = seeded.student;
const admin = seeded.admin;

// 4. Courses owned by the demo faculty member.
const courses = {};
for (const course of COURSES) {
  const query = `/rest/v1/courses?college_id=eq.${college.id}&code=eq.${encodeURIComponent(course.code)}&term=eq.${encodeURIComponent(TERM)}&select=id,code,title,term`;
  let [row] = await get(query);
  if (!row) {
    [row] = await post('/rest/v1/courses?on_conflict=college_id,code,term', {
      college_id: college.id,
      faculty_id: faculty.id,
      code: course.code,
      title: course.title,
      term: TERM,
    }, 'resolution=merge-duplicates,return=representation');
  }
  if (!row?.id) throw new Error(`Course ${course.code} could not be seeded.`);
  courses[course.code] = row;
  console.log(`Course ready: ${row.code} · ${row.title} (${row.term})`);
}

// 5. Active enrolment for the demo student (self-enrolment is denied by policy,
//    so the seed uses the local service role to act as the administrator).
for (const code of ['CS301', 'CS405']) {
  await post('/rest/v1/course_enrollments?on_conflict=course_id,student_id', {
    course_id: courses[code].id,
    student_id: student.id,
    status: 'active',
  }, 'resolution=merge-duplicates,return=representation');
}
console.log(`Enrolled ${student.email} in CS301 and CS405`);

// 6. Notices authored by the demo administrator.
for (const notice of NOTICES) {
  const [existing] = await get(`/rest/v1/notices?college_id=eq.${college.id}&title=eq.${encodeURIComponent(notice.title)}&select=id`);
  if (existing) { console.log(`Notice ready: ${notice.title}`); continue; }
  await post('/rest/v1/notices', {
    college_id: college.id,
    author_id: admin.id,
    title: notice.title,
    body: notice.body,
    audience: notice.audience,
  });
  console.log(`Notice created: ${notice.title}`);
}

// 7. Assignments created by the demo faculty member.
for (const assignment of ASSIGNMENTS) {
  const [existing] = await get(`/rest/v1/assignments?course_id=eq.${courses[assignment.code].id}&title=eq.${encodeURIComponent(assignment.title)}&select=id`);
  if (existing) { console.log(`Assignment ready: ${assignment.title}`); continue; }
  await post('/rest/v1/assignments', {
    course_id: courses[assignment.code].id,
    title: assignment.title,
    description: assignment.description,
    due_at: dayFromNow(assignment.dueInDays),
    max_points: assignment.maxPoints,
    allow_late: assignment.allowLate,
    created_by: faculty.id,
  });
  console.log(`Assignment created: ${assignment.title}`);
}

console.log('\nLocal demo data is ready. Sign in at http://127.0.0.1:3000/login and use:');
for (const account of accounts) console.log(`  ${account.role.padEnd(7)} ${account.email}  ·  ${account.password}`);
console.log('\nFaculty -> Student handoff: /faculty/assignments publishes coursework, /study shows it to the enrolled student.');
