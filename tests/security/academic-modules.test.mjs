import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../../supabase/migrations/202611260009_academic_modules_and_assignment_scope.sql', import.meta.url), 'utf8');
const rls = await readFile(new URL('../../supabase/migrations/202611260002_campuspulse_rls.sql', import.meta.url), 'utf8');

test('assignment reads require active enrollment for students', () => {
  assert.match(migration, /drop policy if exists assignments_read_student_or_course_faculty/i);
  assert.match(migration, /ce\.student_id = auth\.uid\(\)/);
  assert.match(migration, /ce\.status = 'active'/);
  assert.match(migration, /public\.is_faculty_of_course\(course_id\)/);
});

test('new academic tables are RLS protected and college scoped', () => {
  const tables = ['attendance_records', 'grievances', 'scholarships', 'fee_invoices', 'examinations', 'timetable_entries', 'library_books', 'support_tickets'];
  for (const table of tables) {
    assert.match(migration, new RegExp(`'${table}'`, 'i'));
  }
  assert.match(migration, /execute format\('alter table public\.%I enable row level security', t\)/i);
  assert.match(migration, /college_id = public\.current_college_id\(\)/i);
  assert.match(rls, /alter table public\.%I enable row level security/);
});

test('new module writes use caller identity for self-service records', () => {
  assert.match(migration, /grievances_insert_self[\s\S]*student_id = auth\.uid\(\)/);
  assert.match(migration, /scholarships_insert_self[\s\S]*student_id = auth\.uid\(\)/);
  assert.match(migration, /support_insert_self[\s\S]*requester_id = auth\.uid\(\)/);
});
