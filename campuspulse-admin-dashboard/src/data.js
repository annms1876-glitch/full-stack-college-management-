// Live Supabase access for the Admin portal. All reads/writes use the signed-in
// administrator's JWT; role authority is re-verified server side by RLS and the
// Edge functions. A service-role key never reaches the browser.

const unwrap = async (promise, label) => {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

export const DEMO_SNAPSHOT = {
  profiles: [
    { id: 'demo-student-1', full_name: 'Aarav Mehta', role: 'student', college_id: 'demo-college' },
    { id: 'demo-student-2', full_name: 'Ishita Rao', role: 'student', college_id: 'demo-college' },
    { id: 'demo-faculty-1', full_name: 'Dr. Ananya Deshmukh', role: 'faculty', college_id: 'demo-college' },
  ],
  courses: [
    { id: 'demo-course-1', code: 'CS301', title: 'Data Structures & Algorithms', term: 'Odd 2026-27', faculty: { full_name: 'Dr. Ananya Deshmukh' }, course_enrollments: [{ student_id: 'demo-student-1', status: 'active' }] },
    { id: 'demo-course-2', code: 'CS405', title: 'Database Management Systems', term: 'Odd 2026-27', faculty: { full_name: 'Dr. Ananya Deshmukh' }, course_enrollments: [] },
  ],
  assignments: [{ id: 'demo-assignment-1', title: 'AVL Tree Rotations', due_at: new Date(Date.now() + 6 * 864e5).toISOString(), course: { code: 'CS301' } }],
  notices: [{ id: 'demo-notice-1', title: 'Winter break & campus closure', body: 'The campus is closed from 24 Dec to 1 Jan.', audience: 'everyone', published_at: new Date().toISOString(), author: { full_name: 'Admin Office' } }],
  submissions: [{ id: 'demo-submission-1', status: 'submitted', submitted_at: new Date().toISOString(), assignment: { title: 'AVL Tree Rotations', course: { code: 'CS301' } }, student: { full_name: 'Aarav Mehta' } }],
};

/** Same-college directory plus coursework oversight for the console. */
export async function loadAdminSnapshot(client) {
  const [profiles, courses, assignments, notices, submissions] = await Promise.all([
    unwrap(client.from('profiles').select('id,full_name,role,college_id,created_at').order('full_name', { ascending: true }).limit(500), 'Profiles could not load'),
    unwrap(client.from('courses').select('id,code,title,term,college_id,faculty_id,faculty:profiles!courses_faculty_id_fkey(id,full_name),course_enrollments(student_id,status)').order('code', { ascending: true }), 'Courses could not load'),
    unwrap(client.from('assignments').select('id,title,due_at,course_id,course:courses(id,code,title)').order('due_at', { ascending: false }).limit(200), 'Assignments could not load'),
    unwrap(client.from('notices').select('id,title,body,audience,published_at,author:profiles!notices_author_id_fkey(id,full_name)').order('published_at', { ascending: false }).limit(50), 'Notices could not load'),
    unwrap(client.from('assignment_submissions').select('id,status,submitted_at,file_path,file_name,assignment:assignments!assignment_submissions_assignment_id_fkey(id,title,course:courses(id,code)),student:profiles!assignment_submissions_student_id_fkey(id,full_name)').order('submitted_at', { ascending: false }).limit(200), 'Submissions could not load'),
  ]);
  return {
    profiles: profiles || [],
    courses: courses || [],
    assignments: assignments || [],
    notices: notices || [],
    submissions: submissions || [],
  };
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

export async function createCourse(client, profile, { code, title, term, facultyId }) {
  return await unwrap(
    client.from('courses')
      .insert({ code, title, term, faculty_id: facultyId, college_id: profile.college_id })
      .select('id,code,title,term,faculty_id,course_enrollments(student_id,status)')
      .single(),
    'The course could not be created',
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

export async function setEnrolmentStatus(client, courseId, studentId, status) {
  return await unwrap(
    client.from('course_enrollments').update({ status }).match({ course_id: courseId, student_id: studentId }).select('course_id,student_id,status').single(),
    'The enrolment could not be updated',
  );
}

/** The RPC re-checks the caller's admin role, the college boundary and writes the audit row. */
export async function grantRole(client, { userId, role, reason }) {
  const { data, error } = await client.rpc('admin_set_role', {
    target_user: userId,
    new_role: role,
    reason: reason || '',
  });
  if (error) throw new Error(error.message || 'The role change could not be completed');
  return data;
}

export async function listColleges(client) {
  const { data, error } = await client.from('colleges').select('id, name, domain').order('name');
  if (error) throw new Error(error.message || 'The college directory is unavailable');
  return Array.isArray(data) ? data : [];
}

export async function loadModuleRecords(client) {
  return await unwrap(
    client.from('module_records')
      .select('id,module,title,status,details,created_at')
      .order('created_at', { ascending: false })
      .limit(500),
    'Records could not be loaded',
  );
}

export async function createModuleRecord(client, profile, { module, title, status, details }) {
  let collegeId = profile?.college_id;
  if (!collegeId) {
    const me = await unwrap(client.from('profiles').select('college_id').eq('id', profile.id).single(), 'Your college could not be resolved');
    collegeId = me?.college_id;
  }
  if (!collegeId) throw new Error('Your profile has no college assigned, so records cannot be scoped.');
  return await unwrap(
    client.from('module_records')
      .insert({ module, title, status: status || 'Open', details: details || '', college_id: collegeId, created_by: profile.id })
      .select('id,module,title,status,details,created_at')
      .single(),
    'The record could not be saved',
  );
}

export async function deleteModuleRecord(client, id) {
  return await unwrap(client.from('module_records').delete().eq('id', id), 'The record could not be deleted');
}

export async function updateOwnProfile(client, id, { full_name, bio }) {
  return await unwrap(
    client.from('profiles').update({ full_name, bio }).eq('id', id).select('id,full_name,bio,role,college_id').single(),
    'Your profile could not be saved',
  );
}

export async function requestSignedUrl(client, bucket, path) {
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 300);
  if (error) throw new Error(error.message || 'The download link could not be created');
  if (!data?.signedUrl) throw new Error('The download link could not be created');
  return data.signedUrl;
}

export async function askAssistant(client, prompt) {
  const { data, error } = await client.functions.invoke('ai-assistant', { body: { prompt } });
  if (error) throw new Error(data?.error || error.message || 'The assistant is unavailable');
  if (data?.error) throw new Error(data.error);
  return String(data?.answer || '').trim();
}
