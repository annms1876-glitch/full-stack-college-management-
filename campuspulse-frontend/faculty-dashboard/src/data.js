// Live Supabase access for the Faculty portal. Every query runs with the signed-in
// faculty member's JWT, so row level security — not this module — decides what is
// visible or writable. No service-role key is ever present in browser code.

const unwrap = async (promise, label) => {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

export const DEMO_COURSES = [
  { id: 'demo-course-cs301', code: 'CS301', title: 'Data Structures & Algorithms', term: 'Odd 2026-27', course_enrollments: [{ student_id: 'demo-1', status: 'active' }, { student_id: 'demo-2', status: 'active' }, { student_id: 'demo-3', status: 'active' }] },
  { id: 'demo-course-cs405', code: 'CS405', title: 'Database Management Systems', term: 'Odd 2026-27', course_enrollments: [{ student_id: 'demo-2', status: 'active' }, { student_id: 'demo-4', status: 'active' }] },
];

/** Shape used by the portal while anonymous demo mode is active. */
export function demoSnapshot() {
  const soon = new Date(Date.now() + 9 * 864e5).toISOString();
  const later = new Date(Date.now() + 16 * 864e5).toISOString();
  return {
    courses: DEMO_COURSES,
    assignments: [
      { id: 'demo-assignment-1', course_id: 'demo-course-cs301', title: 'AVL Tree Rotations', description: 'Implement insertion and deletion in an AVL tree and document each rotation.', due_at: soon, max_points: 100, allow_late: false, course: { id: 'demo-course-cs301', code: 'CS301', title: 'Data Structures & Algorithms' } },
      { id: 'demo-assignment-2', course_id: 'demo-course-cs405', title: 'Normalization Report', description: 'Explain 3NF decomposition for the supplied schema.', due_at: later, max_points: 50, allow_late: true, course: { id: 'demo-course-cs405', code: 'CS405', title: 'Database Management Systems' } },
    ],
    submissions: [
      { id: 'demo-submission-1', assignment_id: 'demo-assignment-1', file_name: 'avl-trees.pdf', file_size: 284411, mime_type: 'application/pdf', status: 'submitted', grade: null, feedback: null, submitted_at: new Date(Date.now() - 36e5).toISOString(), student: { id: 'demo-1', full_name: 'Aarav Mehta' } },
    ],
    notices: [
      { id: 'demo-notice-1', title: 'Internal assessment schedule', body: 'Submit internal assessment marks by 29 Nov 2026.', audience: 'faculty', published_at: new Date().toISOString(), author: { full_name: 'Admin Office' } },
    ],
  };
}

/** Read the signed-in faculty member's teaching workspace. */
export async function loadFacultySnapshot(client, profile) {
  const courses = await unwrap(
    client.from('courses')
      .select('id,code,title,term,college_id,faculty_id,course_enrollments(student_id,status),faculty:profiles!courses_faculty_id_fkey(id,full_name)')
      .eq('faculty_id', profile.id)
      .order('code', { ascending: true }),
    'Courses could not load',
  ) || [];
  const courseIds = courses.map((course) => course.id);
  const assignments = courseIds.length
    ? await unwrap(
      client.from('assignments')
        .select('id,course_id,title,description,due_at,max_points,allow_late,created_at,course:courses(id,code,title,term)')
        .in('course_id', courseIds)
        .order('due_at', { ascending: false }),
      'Assignments could not load',
    ) || []
    : [];
  const assignmentIds = assignments.map((assignment) => assignment.id);
  const submissions = assignmentIds.length
    ? await unwrap(
      client.from('assignment_submissions')
        .select('id,assignment_id,file_path,file_name,file_size,mime_type,status,grade,feedback,submitted_at,student:profiles!assignment_submissions_student_id_fkey(id,full_name)')
        .in('assignment_id', assignmentIds)
        .order('submitted_at', { ascending: false }),
      'Submissions could not load',
    ) || []
    : [];
  const notices = await unwrap(
    client.from('notices')
      .select('id,title,body,audience,published_at,author:profiles!notices_author_id_fkey(id,full_name)')
      .order('published_at', { ascending: false })
      .limit(20),
    'Notices could not load',
  ) || [];
  return { courses, assignments, submissions, notices };
}

/** Same-college student directory used to enrol students into an owned course. */
export async function loadStudents(client) {
  return await unwrap(
    client.from('profiles').select('id,full_name,role').eq('role', 'student').order('full_name', { ascending: true }).limit(200),
    'Student directory could not load',
  ) || [];
}

export async function publishNotice(client, profile, { title, body, audience }) {
  return await unwrap(
    client.from('notices')
      .insert({ title, body, audience, college_id: profile.college_id, author_id: profile.id })
      .select('id,title,body,audience,published_at,author:profiles!notices_author_id_fkey(id,full_name)')
      .single(),
    'The notice could not be published',
  );
}

export async function publishAssignment(client, { courseId, title, description, dueAt, maxPoints, allowLate, createdBy }) {
  return await unwrap(
    client.from('assignments')
      .insert({ course_id: courseId, title, description, due_at: dueAt, max_points: maxPoints, allow_late: allowLate, created_by: createdBy })
      .select('id,course_id,title,description,due_at,max_points,allow_late,course:courses(id,code,title,term)')
      .single(),
    'The assignment could not be published',
  );
}

export async function enrolStudent(client, courseId, studentId) {
  return await unwrap(
    client.from('course_enrollments')
      .upsert({ course_id: courseId, student_id: studentId, status: 'active' }, { onConflict: 'course_id,student_id' })
      .select('course_id,student_id,status')
      .single(),
    'The student could not be enrolled',
  );
}

export async function gradeSubmission(client, submissionId, { grade, feedback }) {
  return await unwrap(
    client.from('assignment_submissions')
      .update({ status: 'graded', grade, feedback })
      .eq('id', submissionId)
      .select('id,status,grade,feedback')
      .single(),
    'The grade could not be saved',
  );
}

/** Ask Edge code for a short-lived, ownership-checked file URL. */
export async function requestSignedUrl(client, bucket, path) {
  const { data, error } = await client.functions.invoke('get-signed-url', { body: { bucket, path } });
  if (error) throw new Error(data?.error || error.message || 'The download link could not be created');
  if (data?.error) throw new Error(data.error);
  if (!data?.signedUrl) throw new Error('The download link could not be created');
  return data.signedUrl;
}

/** AI workflow uses the deployed Edge function; no API key ever reaches the browser. */
export async function askAssistant(client, prompt) {
  const { data, error } = await client.functions.invoke('ai-assistant', { body: { prompt } });
  if (error) throw new Error(data?.error || error.message || 'The assistant is unavailable');
  if (data?.error) throw new Error(data.error);
  return String(data?.answer || '').trim();
}
