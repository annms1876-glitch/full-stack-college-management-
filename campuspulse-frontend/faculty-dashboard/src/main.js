import './styles.css'
import { startPortalAuth } from './portal-auth.js'
import { initializeTheme } from './theme.js'
import {
  askAssistant,
  demoSnapshot,
  enrolStudent,
  gradeSubmission,
  loadFacultySnapshot,
  loadStudents,
  publishAssignment,
  publishNotice,
  requestSignedUrl,
} from './data.js'

initializeTheme()

const icon = (name) => `<span class="icon icon-${name}" aria-hidden="true"></span>`
let portalAuth = null
const safeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const displayName = () => portalAuth?.profile?.full_name || 'Faculty account'
const initialsFor = (name) => name.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'F'
const shortDate = (value) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) }
const shortDateTime = (value) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
const escape = safeHtml

const nav = [
  ['dashboard', 'Dashboard', '⌂'],
  ['attendance', 'Student Cohort', '✓'],
  ['assignments', 'Assignments & Notices', '▤'],
  ['timetable', 'Timetable', '◷'],
  ['courses', 'Courses & Enrolment', '▣'],
]
const routeNames = {
  dashboard: 'Dashboard',
  attendance: 'Student Cohort',
  assignments: 'Assignments, Notices & Submissions',
  timetable: 'Timetable & Hybrid',
  courses: 'Courses, Enrolment & Notices',
  workflow: 'AI Workflow',
  profile: 'Faculty Profile',
}
const basePath = import.meta.env.BASE_URL.replace(/\/+$/, '')
const portalHref = (route) => {
  const normalized = String(route ?? '').replace(/^\/+|\/+$/g, '')
  return normalized ? `${basePath}/${normalized}` : `${basePath}/` || '/'
}
const routeFromPath = (pathname = location.pathname) => {
  const appPath = basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`)) ? pathname.slice(basePath.length) : pathname
  return appPath.replace(/^\/+/, '').split('/')[0] || 'dashboard'
}
let activeRoute = routeNames[routeFromPath()] ? routeFromPath() : 'dashboard'
let collapsed = false

const emptySnapshot = { courses: [], assignments: [], submissions: [], notices: [] }
const state = {
  snapshot: emptySnapshot,
  students: [],
  loading: false,
  error: '',
  noticeMessage: '',
  assignmentMessage: '',
  workflowAnswer: '',
  workflowError: '',
}

const live = () => Boolean(portalAuth?.client) && !portalAuth?.demo
const enrolledCount = (course) => (course.course_enrollments || []).filter(row => row.status === 'active').length
const dueSoon = () => state.snapshot.assignments.filter(a => {
  const due = new Date(a.due_at).getTime()
  return due >= Date.now() && due <= Date.now() + 7 * 864e5
}).length
const pendingSubmissions = () => state.snapshot.submissions.filter(s => s.status === 'submitted').length
const courseById = (id) => state.snapshot.courses.find(c => c.id === id)

function metrics() {
  const students = new Set()
  state.snapshot.courses.forEach(course => (course.course_enrollments || []).filter(r => r.status === 'active').forEach(r => students.add(r.student_id)))
  return [
    { label: 'My active courses', value: String(state.snapshot.courses.length), delta: live() ? 'Live from courses' : 'Sample data', tone: 'success', icon: '▣' },
    { label: 'Enrolled students', value: String(students.size), delta: `${state.snapshot.courses.length} course${state.snapshot.courses.length === 1 ? '' : 's'}`, tone: 'blue', icon: '♙' },
    { label: 'Assignments due ≤7d', value: String(dueSoon()), delta: `${state.snapshot.assignments.length} published`, tone: 'warning', icon: '▤' },
    { label: 'Submissions to grade', value: String(pendingSubmissions()), delta: `${state.snapshot.submissions.length} total`, tone: 'indigo', icon: '◔' },
  ]
}

function shell(content) {
  const banner = portalAuth?.demo
    ? '<aside class="demo-access-banner" role="status">ANONYMOUS DEMO · Sample data only; no Supabase session, live records, or backend changes.</aside>'
    : ''
  const note = portalAuth?.demo
    ? '<p class="muted" role="note">Anonymous demo · sign in with a faculty account to read and change real records.</p>'
    : '<p class="muted" role="note">Live data · every row below is filtered by row level security for your faculty account.</p>'
  return `<div class="app-shell ${collapsed ? 'is-collapsed' : ''}">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">C</span><span class="sidebar-label brand-name">CampusPulse</span><button class="icon-button collapse-button" data-action="collapse" aria-label="Toggle navigation">${collapsed ? '→' : '←'}</button></div>
      <button class="new-action" data-action="new"><span class="new-plus">+</span><span class="sidebar-label">New assignment</span></button>
      <nav class="nav-list">
        ${nav.map(([route, label, glyph]) => `<a class="nav-item ${activeRoute === route ? 'active' : ''}" href="${portalHref(route)}" title="${label}"><span class="nav-icon">${glyph}</span><span class="sidebar-label">${label}</span></a>`).join('')}
      </nav>
      <div class="nav-divider"></div>
      <a class="nav-item ai-link ${activeRoute === 'workflow' ? 'active' : ''}" href="${portalHref('workflow')}"><span class="nav-icon">✦</span><span class="sidebar-label">AI Workflow</span><span class="ai-badge sidebar-label">AI</span></a>
      <div class="sidebar-spacer"></div>
      <div class="sidebar-user"><div class="avatar small">${escape(initialsFor(displayName()))}</div><div class="sidebar-label user-copy"><strong>${escape(displayName())}</strong><span>${escape(portalAuth?.user?.email || 'Faculty')}</span></div><button class="signout-button" data-action="logout" type="button">Sign out</button></div>
    </aside>
    <main class="main-area">
      <header class="topbar"><div class="breadcrumbs"><span class="muted">CampusPulse</span><span>/</span><strong>${escape(routeNames[activeRoute])}</strong></div><div class="top-actions"><button class="icon-button" data-action="notify" aria-label="Notifications">♧</button><button class="icon-button" data-theme-toggle aria-label="Switch to dark mode" aria-pressed="false"><span data-theme-icon aria-hidden="true">☾</span></button><button class="profile-chip" data-action="profile"><span class="avatar tiny">${escape(initialsFor(displayName()))}</span><span class="profile-chip-name">${escape(displayName())}</span><span>⌄</span></button></div></header>
      <div class="content-wrap">${banner}${note}<div id="portal-body">${content}</div></div>
    </main>
    <div id="toast" class="toast" role="status"></div>
  </div>`
}

const pageHeader = (eyebrow, title, subtitle, actions = '') => `<div class="page-header"><div><div class="eyebrow">${eyebrow}</div><h1>${escape(title)}</h1><p>${escape(subtitle)}</p></div><div class="header-actions">${actions}</div></div>`
const card = (title, body, extra = '') => `<section class="card ${extra}"><div class="card-head"><h2>${title}</h2></div>${body}</section>`
const btn = (label, cls = 'secondary', action = '') => `<button class="btn ${cls}" ${action ? `type="button" data-action="${action}"` : ''}>${label}</button>`
const pill = (text, tone = 'neutral') => `<span class="pill ${tone}">${escape(text)}</span>`
const emptyState = (message) => `<p class="muted" style="margin:6px 0;font-size:12.5px">${escape(message)}</p>`
const formStatus = (message) => message ? `<p class="form-status" role="status">${escape(message)}</p>` : ''

function dashboard() {
  const upcoming = [...state.snapshot.assignments]
    .filter(a => new Date(a.due_at).getTime() >= Date.now() - 864e5)
    .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
    .slice(0, 4)
  const notices = state.snapshot.notices.slice(0, 3)
  return pageHeader('Faculty workspace', 'Faculty Dashboard', `Signed in as ${displayName()}. Live teaching workspace for your assigned courses.`, btn('Manage assignments', 'primary', 'link-assignments')) + `
    <div class="metric-grid">${metrics().map(m => `<div class="metric-card"><div class="metric-top"><span class="metric-icon ${m.tone}">${m.icon}</span><span class="metric-delta ${m.tone}">${escape(m.delta)}</span></div><div class="metric-label">${escape(m.label)}</div><div class="metric-value">${escape(m.value)}</div></div>`).join('')}</div>
    <div class="dashboard-grid"><div class="span-8">${card('Upcoming assignment deadlines', upcoming.length
      ? `<div class="schedule-list">${upcoming.map(a => `<div class="schedule-row"><div class="schedule-time mono">${escape(shortDate(a.due_at))}</div><div class="schedule-dot ${new Date(a.due_at).getTime() < Date.now() ? 'upcoming' : 'in-progress'}"></div><div class="schedule-info"><strong>${escape(a.course?.code || '')} <span class="muted">· ${escape(a.title)}</span></strong><span>${escape(a.course?.title || '')} · ${escape(String(a.max_points))} points · ${escape(String(state.snapshot.submissions.filter(s => s.assignment_id === a.id).length))} submission(s)</span></div><div>${pill(new Date(a.due_at).getTime() < Date.now() ? 'Due passed' : 'Open', new Date(a.due_at).getTime() < Date.now() ? 'neutral' : 'success')}</div></div>`).join('')}</div>`
      : emptyState('No assignments yet. Create one from the Assignments page.'))}
      ${card('My courses', state.snapshot.courses.length
        ? `<div class="table-wrap"><table><thead><tr><th>Course</th><th>Term</th><th>Enrolled</th></tr></thead><tbody>${state.snapshot.courses.map(c => `<tr><td><strong>${escape(c.code)}</strong><span class="muted"> · ${escape(c.title)}</span></td><td>${escape(c.term)}</td><td>${enrolledCount(c)}</td></tr>`).join('')}</tbody></table></div>`
        : emptyState('No courses are assigned to your profile yet.'))}</div><div class="span-4">${card('Recent notices', notices.length
      ? `<div class="announcement-list">${notices.map(n => `<div class="announcement"><span class="announcement-dot green"></span><div><strong>${escape(n.title)}</strong><p>${escape(String(n.body).slice(0, 120))}</p><span class="muted">${escape(n.audience)} · ${escape(shortDate(n.published_at))}</span></div></div>`).join('')}</div><a class="text-link" href="${portalHref('assignments')}">Publish a notice →</a>`
      : emptyState('No notices in your college yet.'))}</div></div>
    <div class="section-heading"><h2>Quick tools</h2><span class="muted">Common faculty actions</span></div><div class="quick-grid">${[['▤', 'Create assignment', 'Publish coursework to a course', 'assignments'], ['♢', 'Publish notice', 'Reach students and faculty', 'assignments'], ['♙', 'Enrol a student', 'Add a student to your course', 'courses'], ['✦', 'Ask AI workflow', 'Get help with academic tasks', 'workflow']].map(x => `<a class="quick-card" href="${portalHref(x[3])}"><span class="quick-icon">${x[0]}</span><div><strong>${x[1]}</strong><span>${x[2]}</span></div><span class="arrow">→</span></a>`).join('')}</div>`
}

function courses() {
  const cards = state.snapshot.courses.map(c => `<div class="course-card"><div class="course-code mono">${escape(c.code)}</div><h2>${escape(c.title)}</h2><p>${escape(c.term)} · ${enrolledCount(c)} enrolled</p><div class="course-foot"><span class="course-attendance success">${escape(String(state.snapshot.assignments.filter(a => a.course_id === c.id).length))} assignments</span><span class="muted">${escape(c.faculty?.full_name || displayName())}</span></div></div>`).join('')
  const enrolOptions = state.students.map(s => `<option value="${escape(s.id)}">${escape(s.full_name)}</option>`).join('')
  const enrolForms = state.snapshot.courses.map(c => `<form class="enrol-form" data-course-id="${escape(c.id)}" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0"><strong class="mono" style="min-width:64px">${escape(c.code)}</strong><select class="input" name="student_id" style="max-width:260px" required>${enrolOptions || '<option value="">No students available</option>'}</select><button class="btn small primary" type="submit" ${enrolOptions ? '' : 'disabled'}>Enrol student</button></form>`).join('')
  const noticeForm = `<form id="notice-form" class="notice-form"><label class="field-label" for="notice-title">Notice title</label><input class="input" id="notice-title" name="title" maxlength="200" required placeholder="e.g. Internal assessment schedule" /><label class="field-label" for="notice-body">Notice body</label><textarea class="input textarea" id="notice-body" name="body" maxlength="20000" required placeholder="What should students and faculty know?"></textarea><div class="form-row"><div><label class="field-label" for="notice-audience">Audience</label><select class="input" id="notice-audience" name="audience"><option value="students">Students</option><option value="faculty">Faculty</option><option value="college">Whole college</option><option value="everyone">Everyone</option></select></div><div><label class="field-label" for="notice-publish">Publish now</label><input class="input" id="notice-publish" name="published" value="${new Date().toISOString().slice(0, 10)}" readonly /></div></div><div style="margin-top:14px"><button class="btn primary" type="submit">Publish notice</button></div>${formStatus(state.noticeMessage)}</form>`
  const noticeList = state.snapshot.notices.length
    ? `<div class="announcement-list">${state.snapshot.notices.map(n => `<div class="announcement"><span class="announcement-dot blue"></span><div><strong>${escape(n.title)}</strong><p>${escape(String(n.body).slice(0, 180))}</p><span class="muted">${escape(n.audience)} · ${escape(n.author?.full_name || 'Faculty')} · ${escape(shortDate(n.published_at))}</span></div></div>`).join('')}</div>`
    : emptyState('No notices published for your audience yet.')
  return pageHeader('Academic records', 'Courses, Enrolment & Notices', 'Your live teaching portfolio. Enrolments and notices are written to Supabase under your own JWT.', btn('Ask AI workflow', 'secondary', 'link-workflow')) + `
    <div class="course-grid">${cards || '<p class="muted">No courses assigned yet.</p>'}</div>
    <div class="two-col"><div class="span-8">${card('Enrol students into your courses', state.snapshot.courses.length ? enrolForms : emptyState('Create or receive a course assignment first. Student self-enrolment is disabled by policy.'))}</div><div class="span-4">${card('Attendance tracking', emptyState('Attendance is not part of the current schema, so this portal does not display attendance figures. The Student Cohort page lists the enrolled students you can act on today.'))}</div></div>
    <div class="two-col"><div class="span-5">${card('Publish a notice', noticeForm)}</div><div class="span-7">${card('Live notices', noticeList)}</div></div>`
}

function assignments() {
  const courseOptions = state.snapshot.courses.map(c => `<option value="${escape(c.id)}">${escape(c.code)} · ${escape(c.title)}</option>`).join('')
  const form = `<form id="assignment-form"><label class="field-label" for="assignment-course">Course</label><select class="input" id="assignment-course" name="course_id" required>${courseOptions || '<option value="">No courses available</option>'}</select><label class="field-label" for="assignment-title">Title</label><input class="input" id="assignment-title" name="title" maxlength="200" required placeholder="e.g. AVL tree rotations" /><label class="field-label" for="assignment-description">Instructions</label><textarea class="input textarea" id="assignment-description" name="description" maxlength="20000" placeholder="What should students submit?"></textarea><div class="form-row"><div><label class="field-label" for="assignment-due">Due date</label><input class="input" id="assignment-due" name="due_at" type="date" required value="${new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)}" /></div><div><label class="field-label" for="assignment-points">Max points</label><input class="input" id="assignment-points" name="max_points" type="number" min="1" max="1000" step="0.5" value="100" /></div></div><label class="field-label"><input type="checkbox" name="allow_late" /> Allow late submissions</label><div style="margin-top:14px"><button class="btn primary" type="submit" ${courseOptions ? '' : 'disabled'}>Publish assignment</button></div>${formStatus(state.assignmentMessage)}</form>`
  const rows = state.snapshot.assignments.map(a => {
    const subs = state.snapshot.submissions.filter(s => s.assignment_id === a.id)
    const course = a.course || courseById(a.course_id) || {}
    const submissionRows = subs.length
      ? subs.map(s => `<div class="submission-row"><div><strong>${escape(s.student?.full_name || 'Student')}</strong><span class="muted"> · ${escape(s.file_name)} · ${escape(shortDateTime(s.submitted_at))} · ${escape(s.status)}</span></div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn small secondary" type="button" data-download="${escape(s.id)}">Download file</button><form class="grade-form" data-submission-id="${escape(s.id)}" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><input class="input" name="grade" type="number" min="0" max="${escape(String(a.max_points))}" step="0.5" placeholder="Grade" value="${s.grade ?? ''}" style="width:88px" aria-label="Grade for ${escape(s.student?.full_name || 'student')}" /><input class="input" name="feedback" maxlength="10000" placeholder="Feedback" value="${escape(s.feedback || '')}" style="min-width:180px;flex:1" aria-label="Feedback for ${escape(s.student?.full_name || 'student')}" /><button class="btn small primary" type="submit">Save grade</button></form></div></div>`).join('')
      : emptyState('No submissions yet.')
    return `<div class="assignment-block"><div class="assignment-head"><div><strong>${escape(course.code || '')}</strong> · ${escape(a.title)}<div class="muted" style="font-size:12px">Due ${escape(shortDateTime(a.due_at))} · ${escape(String(a.max_points))} points · ${subs.length} submission(s)${a.allow_late ? ' · late allowed' : ''}</div></div>${pill(new Date(a.due_at).getTime() < Date.now() ? 'Closed' : 'Open', new Date(a.due_at).getTime() < Date.now() ? 'neutral' : 'success')}</div><div class="submission-list">${submissionRows}</div></div>`
  }).join('')
  return pageHeader('Faculty operations', 'Assignments, Notices & Submissions', 'Publish coursework, review submissions and grade work. Files stay in the private assignments bucket.', btn('Publish notice', 'secondary', 'link-courses')) + `
    <div class="two-col assignment-cols"><div class="span-5">${card('Create an assignment', form)}</div><div class="span-7">${card('How submissions work', emptyState('Students upload to the private assignments bucket (25 MiB limit, allowlisted types). Download buttons mint a 2-minute signed URL through the get-signed-url Edge function, which re-checks your course ownership and the file magic bytes before signing.'))}${card('Recent notices', state.snapshot.notices.length ? state.snapshot.notices.slice(0, 3).map(n => `<div class="announcement"><span class="announcement-dot red"></span><div><strong>${escape(n.title)}</strong><p>${escape(String(n.body).slice(0, 120))}</p><span class="muted">${escape(n.audience)} · ${escape(shortDate(n.published_at))}</span></div></div>`).join('') : emptyState('No notices yet.'))}</div></div>
    <div class="section-heading"><h2>Published assignments & submissions</h2><span class="muted">${state.snapshot.assignments.length} assignment(s)</span></div><div class="card">${rows || emptyState('No assignments published yet.')}</div>`
}

function timetable() {
  const days = ['Mon 24', 'Tue 25', 'Wed 26', 'Thu 27', 'Fri 28']
  return pageHeader('Teaching operations', 'Timetable & Hybrid Teaching', 'Timetable planning is illustrative in this build: no timetable table exists in the schema, so nothing here is persisted.', btn('Ask AI to plan a lesson', 'primary', 'link-workflow')) + `<div class="two-col timetable-cols">${card('Illustrative weekly board', `<div class="week-nav"><button class="icon-button" disabled aria-label="Previous week unavailable">‹</button><strong>24 – 28 November 2026 · sample</strong><button class="icon-button" disabled aria-label="Next week unavailable">›</button></div><div class="week-grid">${days.map((d, i) => `<div class="day-col"><div class="day-label ${i === 0 ? 'today' : ''}">${d}</div>${[['09:30', state.snapshot.courses[0]?.code || 'CS301', 'Lecture'], ['11:00', state.snapshot.courses[1]?.code || 'CS405', 'Lecture'], ['14:00', state.snapshot.courses[0]?.code || 'CS301', 'Tutorial']].slice(0, i === 2 ? 2 : 3).map(x => `<div class="lesson purple"><span class="mono">${x[0]}</span><strong>${escape(x[1])}</strong><span>${x[2]}</span></div>`).join('')}</div>`).join('')}</div>`)}${card('AI lesson planner', `<div class="ai-panel"><div class="ai-orb">✦</div><div><h3>Plan with the AI workflow</h3><p>The AI assistant runs as a Supabase Edge function with server-held provider keys. It uses your college course directory as context.</p></div></div>${emptyState('Open the AI Workflow page to draft a lesson plan. Generated text is advisory and is not saved automatically.')}<a class="btn secondary" href="${portalHref('workflow')}">Open AI workflow →</a>`)}</div>`
}

function attendance() {
  const cohort = state.snapshot.courses.map(c => {
    const rows = (c.course_enrollments || []).filter(r => r.status === 'active')
    return `<div class="assignment-block"><div class="assignment-head"><div><strong>${escape(c.code)}</strong> · ${escape(c.title)}<div class="muted" style="font-size:12px">${rows.length} active enrolment(s)</div></div>${pill(c.term, 'neutral')}</div>${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Status</th></tr></thead><tbody>${rows.map(r => `<tr><td>${escape(state.students.find(s => s.id === r.student_id)?.full_name || `Student ${String(r.student_id).slice(0, 8)}`)}</td><td>${pill(r.status, 'success')}</td></tr>`).join('')}</tbody></table></div>` : emptyState('No students enrolled yet.')}</div>`
  }).join('')
  return pageHeader('Faculty operations', 'Student Cohort', 'The enrolled students you can act on today, read live from public.course_enrollments.', btn('Enrol a student', 'primary', 'link-courses')) + `${card('Cohort by course', cohort || emptyState('No courses assigned yet.'))}${card('Attendance capture', emptyState('Attendance registers are not modelled in the current schema. This portal intentionally shows no attendance figures rather than sample numbers. Adding an attendance table with faculty-scoped RLS is the next incremental step.'))}`
}

function workflow() {
  const history = state.snapshot.assignments.slice(0, 3).map(a => `<button class="history-item" type="button" data-prompt="Summarise ${escape(a.course?.code || '')} ${escape(a.title)}">${escape(a.title)}<span>›</span></button>`).join('')
  const answer = state.workflowError
    ? `<div class="execution-card" role="status"><p class="execution-copy">${escape(state.workflowError)}</p></div>`
    : state.workflowAnswer
      ? `<div class="execution-card" role="status"><p class="execution-copy">${escape(state.workflowAnswer)}</p></div>`
      : ''
  const body = `<div class="workflow-layout"><aside class="workflow-sidebar card"><div class="workflow-title"><span class="ai-orb small-orb">✦</span><strong>Suggested prompts</strong></div>${[['Attendance follow-up', 'Draft a supportive note for an absent student', 'Draft a short, supportive follow-up note for a student who missed my last class.'], ['Lesson plan', 'Structure a 55-minute class', 'Create a 55-minute lesson plan for my next ' + (state.snapshot.courses[0]?.code || 'CS301') + ' class.'], ['Assignment brief', 'Turn an objective into coursework', 'Write an assignment brief about balanced trees for undergraduate students.']].map(x => `<button class="agent-item" type="button" data-prompt="${escape(x[2])}"><span class="agent-icon">✦</span><span><strong>${escape(x[0])}</strong><small>${escape(x[1])}</small></span><span>›</span></button>`).join('') || emptyState('No prompts available.')}<div class="history-label">Your assignments</div>${history}</aside><section class="workflow-main card"><div class="conversation"><div class="assistant-message"><span class="ai-orb small-orb">✦</span><div><strong>CampusPulse AI</strong><p>${live() ? 'Ask about your courses. The assistant only receives the course directory for your college and never sees your session token.' : 'Sign in with a faculty account to use the deployed ai-assistant function. The anonymous demo does not call any backend.'}</p></div></div>${answer || `<div class="suggestion-grid">${[['Plan a lesson', '55-minute teaching flow', 'Create a 55-minute lesson plan for my next class.'], ['Draft feedback', 'Supportive, specific notes', 'Draft constructive feedback for a student who submitted late work.'], ['Summarise coursework', 'Assignment overview', 'Summarise the assignments I have published this term.'], ['Prepare a notice', 'Clear student messaging', 'Draft a notice reminding students about an upcoming deadline.']].map(x => `<button class="suggestion-card" type="button" data-prompt="${escape(x[2])}"><strong>${x[0]}</strong><span>${x[1]}</span><span class="arrow">→</span></button>`).join('')}</div>`}</div><div class="composer"><textarea id="workflow-input" placeholder="Ask CampusPulse AI to help with a teaching task..."></textarea><div class="composer-bottom"><span class="muted">Edge function · rate limited to 20 requests/minute</span><button class="send-button" data-action="send-workflow" aria-label="Send request">↑</button></div></div></section></div>`
  return pageHeader('AI workspace', 'AI Workflow Assistant', 'Prompt the deployed AI Edge function. Provider keys live in Supabase secrets, never in this bundle.', '') + body
}

function profile() {
  const profile = portalAuth?.profile || {}
  const stats = `<div class="profile-stats"><div><strong>${state.snapshot.courses.length}</strong><span>active courses</span></div><div><strong>${state.snapshot.assignments.length}</strong><span>assignments</span></div><div><strong>${state.snapshot.submissions.length}</strong><span>submissions</span></div></div>`
  return pageHeader('Faculty workspace', 'Faculty Profile', 'Your trusted CampusPulse profile. Role and college are server-controlled and cannot be edited here.', btn('Open AI workflow', 'primary', 'link-workflow')) + `<div class="profile-layout"><section class="profile-card card"><div class="profile-hero"><div class="avatar large">${escape(initialsFor(displayName()))}</div><div><h2>${escape(displayName())}</h2><p>${escape(portalAuth?.demo ? 'Anonymous demo · no session' : 'Verified faculty account')}</p><span class="mono muted">${escape(profile.id || 'no profile id')} · ${escape(portalAuth?.user?.email || 'no email')}</span></div></div>${stats}<div class="profile-section"><h3>Access</h3><p>Role: <strong>${escape(profile.role || 'faculty')}</strong><br />College: <span class="mono">${escape(profile.college_id || 'not assigned')}</span></p><p class="muted">Editing your name, avatar or bio uses the profile self-service columns only; role and college require a trusted admin action.</p></div></section><div class="cv-column">${card('Portfolio content', emptyState('CV, publications and teaching history are illustrative in this build — no portfolio tables exist in the schema. Nothing on this page is stored.'))}</div></div>`
}

const pages = { dashboard, courses, timetable, attendance, assignments, workflow, profile }

function render() {
  document.querySelector('#app').innerHTML = shell(pages[activeRoute]())
  bindEvents()
}

function toast(message) {
  const el = document.querySelector('#toast')
  if (!el) return
  el.textContent = message
  el.classList.add('show')
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => el.classList.remove('show'), 3200)
}

function setMessages(patch) { Object.assign(state, patch); render() }

async function refresh() {
  if (!portalAuth) return
  if (!live()) { state.snapshot = demoSnapshot(); state.students = []; render(); return }
  state.loading = true
  try {
    const [snapshot, students] = await Promise.all([
      loadFacultySnapshot(portalAuth.client, portalAuth.profile),
      loadStudents(portalAuth.client).catch(() => []),
    ])
    state.snapshot = snapshot
    state.students = students
    state.error = ''
  } catch (error) {
    state.error = error.message || 'Live data could not load.'
    toast(state.error)
  } finally {
    state.loading = false
    render()
  }
}

const requireLive = () => {
  if (live()) return true
  toast('Sign in with a faculty account to make changes. The anonymous demo never writes.')
  return false
}

function bindEvents() {
  document.querySelectorAll('[data-action="collapse"]').forEach(el => el.onclick = () => { collapsed = !collapsed; render() })
  document.querySelectorAll('[data-action="profile"]').forEach(el => el.onclick = () => navigate('profile'))
  document.querySelectorAll('[data-action="logout"]').forEach(el => el.onclick = async () => {
    if (portalAuth?.demo) { sessionStorage.removeItem('campuspulse:faculty-demo'); location.replace('/'); return }
    try { const { error } = await portalAuth?.client.auth.signOut(); if (error) throw error; location.replace('/') } catch (error) { toast(error.message || 'Could not sign out.') }
  })
  document.querySelectorAll('[data-action="notify"]').forEach(el => el.onclick = () => toast(`${state.snapshot.notices.length} notice(s) visible to your account.`))
  document.querySelectorAll('[data-action="link-assignments"]').forEach(el => el.onclick = () => navigate('assignments'))
  document.querySelectorAll('[data-action="link-courses"]').forEach(el => el.onclick = () => navigate('courses'))
  document.querySelectorAll('[data-action="link-workflow"]').forEach(el => el.onclick = () => navigate('workflow'))
  document.querySelectorAll('[data-action="new"]').forEach(el => el.onclick = () => navigate('assignments'))

  // Assignment creation
  document.querySelector('#assignment-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!requireLive()) return
    const form = event.currentTarget
    if (!form.reportValidity()) return
    const values = new FormData(form)
    const courseId = String(values.get('course_id') || '')
    if (!courseId) { setMessages({ assignmentMessage: 'Choose a course first.' }); return }
    const dueValue = String(values.get('due_at') || '')
    const dueAt = new Date(`${dueValue}T23:59:00`)
    if (Number.isNaN(dueAt.getTime())) { setMessages({ assignmentMessage: 'Enter a valid due date.' }); return }
    const button = form.querySelector('button[type="submit"]')
    button.disabled = true
    try {
      await publishAssignment(portalAuth.client, {
        courseId,
        title: String(values.get('title') || '').trim(),
        description: String(values.get('description') || '').trim(),
        dueAt: dueAt.toISOString(),
        maxPoints: Number(values.get('max_points') || 100),
        allowLate: values.get('allow_late') === 'on',
        createdBy: portalAuth.profile.id,
      })
      await refresh()
      setMessages({ assignmentMessage: 'Assignment published to Supabase.' })
    } catch (error) {
      setMessages({ assignmentMessage: error.message || 'The assignment could not be published.' })
    } finally { button.disabled = false }
  })

  // Notice publishing
  document.querySelector('#notice-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!requireLive()) return
    const form = event.currentTarget
    if (!form.reportValidity()) return
    const values = new FormData(form)
    const button = form.querySelector('button[type="submit"]')
    button.disabled = true
    try {
      await publishNotice(portalAuth.client, portalAuth.profile, {
        title: String(values.get('title') || '').trim(),
        body: String(values.get('body') || '').trim(),
        audience: String(values.get('audience') || 'students'),
      })
      await refresh()
      setMessages({ noticeMessage: 'Notice published. Students in your college can see it now.' })
    } catch (error) {
      setMessages({ noticeMessage: error.message || 'The notice could not be published.' })
    } finally { button.disabled = false }
  })

  // Enrolment
  document.querySelectorAll('form.enrol-form').forEach(form => form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!requireLive()) return
    const studentId = String(new FormData(form).get('student_id') || '')
    if (!studentId) return
    const button = form.querySelector('button[type="submit"]')
    button.disabled = true
    try {
      await enrolStudent(portalAuth.client, form.dataset.courseId, studentId)
      toast('Student enrolled.')
      await refresh()
    } catch (error) { toast(error.message || 'The student could not be enrolled.') } finally { button.disabled = false }
  }))

  // Grading
  document.querySelectorAll('form.grade-form').forEach(form => form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!requireLive()) return
    const values = new FormData(form)
    const gradeValue = String(values.get('grade') || '').trim()
    const grade = gradeValue === '' ? null : Number(gradeValue)
    if (grade !== null && (!Number.isFinite(grade) || grade < 0)) { toast('Enter a valid non-negative grade.'); return }
    const button = form.querySelector('button[type="submit"]')
    button.disabled = true
    try {
      await gradeSubmission(portalAuth.client, form.dataset.submissionId, { grade, feedback: String(values.get('feedback') || '').trim() || null })
      toast('Grade saved.')
      await refresh()
    } catch (error) { toast(error.message || 'The grade could not be saved.') } finally { button.disabled = false }
  }))

  // Signed-URL downloads
  document.querySelectorAll('[data-download]').forEach(button => button.addEventListener('click', async () => {
    const submission = state.snapshot.submissions.find(s => s.id === button.dataset.download)
    if (!submission) { toast('Submission not found.'); return }
    if (!requireLive()) return
    button.disabled = true
    try {
      const url = await requestSignedUrl(portalAuth.client, 'assignments', submission.file_path || submission.file_name)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) { toast(error.message || 'The download link could not be created.') } finally { button.disabled = false }
  }))

  // AI workflow
  const runWorkflow = async (prompt) => {
    if (!prompt) { toast('Describe what you want CampusPulse AI to do.'); return }
    if (!live()) { toast('Sign in with a faculty account to call the ai-assistant function.'); return }
    setMessages({ workflowAnswer: '', workflowError: 'Asking CampusPulse AI…' })
    try {
      const answer = await askAssistant(portalAuth.client, prompt)
      setMessages({ workflowAnswer: answer || 'The assistant returned no text.', workflowError: '' })
    } catch (error) {
      setMessages({ workflowError: error.message || 'The assistant is unavailable.', workflowAnswer: '' })
    }
  }
  document.querySelectorAll('[data-action="send-workflow"]').forEach(el => el.onclick = () => runWorkflow(document.querySelector('#workflow-input')?.value.trim()))
  document.querySelectorAll('[data-prompt]').forEach(el => el.onclick = () => {
    const input = document.querySelector('#workflow-input')
    if (input) input.value = el.dataset.prompt
    runWorkflow(el.dataset.prompt)
  })
  document.querySelectorAll('.mode').forEach(el => el.onclick = () => { el.parentElement.querySelectorAll('.mode').forEach(b => b.classList.remove('active')); el.classList.add('active') })
}

function navigate(route) {
  const target = routeNames[route] ? route : routeFromPath(route)
  history.pushState({}, '', target === 'dashboard' ? portalHref('') : portalHref(target))
  activeRoute = routeNames[target] ? target : 'dashboard'
  render()
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]')
  if (!a || a.origin !== location.origin || a.getAttribute('href').startsWith('#')) return
  const pathname = new URL(a.href).pathname
  const isPortalPath = basePath ? pathname === basePath || pathname.startsWith(`${basePath}/`) : pathname !== '/'
  if (!isPortalPath) return
  e.preventDefault()
  navigate(routeFromPath(pathname))
})
window.addEventListener('popstate', () => { activeRoute = routeFromPath(); render() })
startPortalAuth({ onAuthorized: (session) => { portalAuth = session; refresh() } })
