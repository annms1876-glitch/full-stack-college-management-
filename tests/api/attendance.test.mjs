import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCourseAttendance, saveCourseAttendance } from '../../campuspulse-frontend/faculty-dashboard/src/data.js';

function fakeClient(result = { data: [], error: null }) {
  const calls = [];
  let table = '';
  const query = {
    select(value) { calls.push(['select', value]); return query; },
    eq(column, value) { calls.push(['eq', column, value]); return query; },
    order(column, options) { calls.push(['order', column, options]); return query; },
    upsert(rows, options) { calls.push(['upsert', rows, options]); return query; },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  return {
    calls,
    get table() { return table; },
    from(name) { table = name; return query; },
  };
}

test('attendance reads are scoped to a course and class date', async () => {
  const client = fakeClient({ data: [{ student_id: 'student-1', status: 'present' }], error: null });
  const rows = await loadCourseAttendance(client, 'course-1', '2026-11-26');
  assert.equal(client.table, 'attendance_records');
  assert.deepEqual(rows, [{ student_id: 'student-1', status: 'present' }]);
  assert.ok(client.calls.some(([method, column, value]) => method === 'eq' && column === 'course_id' && value === 'course-1'));
  assert.ok(client.calls.some(([method, column, value]) => method === 'eq' && column === 'class_date' && value === '2026-11-26'));
});

test('attendance saves explicit statuses with caller identity and unique-key upsert', async () => {
  const client = fakeClient({ data: [{ student_id: 'student-1', status: 'late' }], error: null });
  const result = await saveCourseAttendance(client, { id: 'faculty-1', college_id: 'college-1' }, {
    courseId: 'course-1',
    classDate: '2026-11-26',
    entries: [{ studentId: 'student-1', status: 'late' }],
  });
  const upsert = client.calls.find(([method]) => method === 'upsert');
  assert.equal(client.table, 'attendance_records');
  assert.deepEqual(result, [{ student_id: 'student-1', status: 'late' }]);
  assert.deepEqual(upsert[1], [{
    college_id: 'college-1',
    course_id: 'course-1',
    student_id: 'student-1',
    class_date: '2026-11-26',
    status: 'late',
    marked_by: 'faculty-1',
    note: '',
  }]);
  assert.deepEqual(upsert[2], { onConflict: 'course_id,student_id,class_date' });
});

test('attendance rejects statuses outside the database constraint', async () => {
  const client = fakeClient();
  await assert.rejects(
    saveCourseAttendance(client, { id: 'faculty-1', college_id: 'college-1' }, {
      courseId: 'course-1',
      classDate: '2026-11-26',
      entries: [{ studentId: 'student-1', status: 'unknown' }],
    }),
    /valid attendance status/,
  );
  assert.equal(client.calls.length, 0);
});
