import './styles.css';
import { startPortalAuth } from './portal-auth.js';
import { initializeTheme } from './theme.js';
import {
  DEMO_SNAPSHOT,
  askAssistant,
  createCourse,
  enrolStudent,
  grantRole,
  listColleges,
  loadAdminSnapshot,
  loadModuleRecords,
  createModuleRecord,
  deleteModuleRecord,
  updateOwnProfile,
  publishNotice,
  requestSignedUrl,
} from './data.js';

initializeTheme();

const portalBase = import.meta.env.BASE_URL.replace(/\/+$/, '');
const portalPath = (path) => `${portalBase}/${String(path || '/').replace(/^\/+/, '')}`;
let portalAuth = null;
const profileName = () => portalAuth?.profile?.full_name || 'CampusPulse Admin';

const modules = [
  { id: 'dashboard', path: '/', label: 'Dashboard', icon: 'layout-dashboard' },
  { id: 'student-records', path: '/student-records', label: 'Student Records', icon: 'graduation-cap' },
  { id: 'faculty-management', path: '/faculty-management', label: 'Faculty Management', icon: 'users' },
  { id: 'timetable-management', path: '/timetable-management', label: 'Timetable Management', icon: 'calendar-days' },
  { id: 'assignment-management', path: '/assignment-management', label: 'Assignment Management', icon: 'clipboard-list' },
  { id: 'scholarship-tracker', path: '/scholarship-tracker', label: 'Scholarship Tracker', icon: 'award' },
  { id: 'fees-submissions', path: '/fees-submissions', label: 'Fees & Submissions', icon: 'indian-rupee' },
  { id: 'grievance-management', path: '/grievance-management', label: 'Grievance Management', icon: 'shield-alert' },
  { id: 'student-support', path: '/student-support', label: 'Student Support', icon: 'life-buoy' },
  { id: 'e-library', path: '/e-library', label: 'E-Library', icon: 'book-open' },
  { id: 'examination-management', path: '/examination-management', label: 'Examination Management', icon: 'file-check-2' },
  { id: 'notices-announcements', path: '/notices-announcements', label: 'Notices & Announcements', icon: 'megaphone' },
  { id: 'course-information', path: '/course-information', label: 'Course Information', icon: 'layers' },
  { id: 'agentic-workflow', path: '/agentic-workflow', label: 'Agentic Workflow', icon: 'workflow', ai: true },
  { id: 'admin-settings', path: '/admin-settings', label: 'Admin Settings', icon: 'settings' },
];

const datasets = {
  'timetable-management': {
    title: 'Timetable Management', subtitle: 'Publish clash-free schedules for departments and classrooms.', action: 'Create Timetable', icon: 'calendar-plus', columns: ['Weekday', 'Time', 'Course', 'Faculty', 'Room', 'Status'], rows: [
      ['Monday', '09:00 – 10:00', 'Data Structures · CS301', 'Dr. Meera Deshpande', 'Lab 204', ['Published', 'success']],
      ['Monday', '11:00 – 12:00', 'Signals & Systems · EC203', 'Prof. Aditya Menon', 'Room 12', ['Published', 'success']],
      ['Tuesday', '10:00 – 11:00', 'Machine Learning · AI402', 'Dr. Kavya Iyer', 'Lab 410', ['Draft', 'warning']],
      ['Wednesday', '14:00 – 15:00', 'Thermodynamics · ME305', 'Dr. Nikhil Bhandari', 'Workshop 2', ['Review', 'info']],
    ]
  },
  'assignment-management': {
    title: 'Assignment Management', subtitle: 'Track submissions, deadlines, and faculty review queues.', action: 'Create Assignment', icon: 'clipboard-plus', columns: ['Assignment', 'Course', 'Due Date', 'Submissions', 'Owner', 'Status'], rows: [
      ['DBMS Normalization', 'CS302', '28 Nov 2026', '86 / 120', 'Dr. Meera Deshpande', ['Due Soon', 'warning']],
      ['Neural Networks Lab', 'AI402', '30 Nov 2026', '54 / 80', 'Dr. Kavya Iyer', ['Open', 'info']],
      ['Microprocessors Case Study', 'EC304', '01 Dec 2026', '64 / 74', 'Prof. Aditya Menon', ['Open', 'success']],
      ['CAD Portfolio', 'ME403', '04 Dec 2026', '18 / 68', 'Prof. Ritesh Sane', ['Needs Attention', 'danger']],
    ]
  },
  'scholarship-tracker': {
    title: 'Scholarship Tracker', subtitle: 'Monitor eligibility, verification, and disbursement across schemes.', action: 'Add Application', icon: 'award', columns: ['Student', 'Scheme', 'Amount', 'Submitted', 'Verification', 'Status'], rows: [
      ['Siddharth Nair · AI25B008', 'Merit Institutional', '₹75,000', '20 Nov 2026', 'Complete', ['Approved', 'success']],
      ['Sneha Patil · EC24B044', 'MahaDBT EBC', '₹42,500', '18 Nov 2026', 'Income certificate', ['Pending Docs', 'warning']],
      ['Vikram Joshi · ME22B087', 'NSP Renewal', '₹28,000', '14 Nov 2026', 'Complete', ['Under Review', 'info']],
      ['Ananya Rao · CS24B031', 'AICTE Pragati', '₹50,000', '09 Nov 2026', 'Complete', ['Approved', 'success']],
    ]
  },
  'fees-submissions': {
    title: 'Fees & Submissions', subtitle: 'Review fee collections, pending invoices, and payment evidence.', action: 'Record Payment', icon: 'receipt-indian-rupee', columns: ['Receipt', 'Student', 'Term', 'Amount', 'Payment Date', 'Status'], rows: [
      ['RCPT-2026-1142', 'Aarav Sharma · CS23B001', 'Odd Sem 2026-27', '₹68,500', '24 Nov 2026', ['Paid', 'success']],
      ['INV-2026-2087', 'Sneha Patil · EC24B044', 'Odd Sem 2026-27', '₹18,500', '—', ['Pending', 'warning']],
      ['RCPT-2026-1098', 'Siddharth Nair · AI25B008', 'Odd Sem 2026-27', '₹72,000', '22 Nov 2026', ['Paid', 'success']],
      ['RCPT-2026-1022', 'Rohan Kulkarni · CS23B019', 'Odd Sem 2026-27', '₹68,500', '17 Nov 2026', ['Paid', 'success']],
    ]
  },
  'grievance-management': {
    title: 'Grievance Management', subtitle: 'Resolve student concerns with clear ownership and SLA visibility.', action: 'Log Grievance', icon: 'shield-plus', columns: ['Ticket', 'Category', 'Student', 'Age', 'Owner', 'Priority'], rows: [
      ['GRV-2026-031', 'Hostel & Facilities', 'Maya Kulkarni · CS24B044', '9 days', 'Student Affairs', ['Escalated', 'danger']],
      ['GRV-2026-029', 'Examination', 'Rohan Kulkarni · CS23B019', '5 days', 'Exam Cell', ['In Progress', 'info']],
      ['GRV-2026-027', 'Finance', 'Sneha Patil · EC24B044', '3 days', 'Accounts Office', ['Open', 'warning']],
      ['GRV-2026-021', 'Library', 'Aarav Sharma · CS23B001', '1 day', 'Library Desk', ['Resolved', 'success']],
    ]
  },
  'student-support': {
    title: 'Student Support', subtitle: 'Central queue for counselling, support requests, and case notes.', action: 'New Support Case', icon: 'life-buoy', columns: ['Case', 'Student', 'Support Type', 'Assigned To', 'Updated', 'Status'], rows: [
      ['SUP-489', 'Riya Shah · AI24B021', 'Academic Counselling', 'Ms. Pooja Nair', 'Today, 10:42 AM', ['Open', 'info']],
      ['SUP-486', 'Vivek Rao · ME23B045', 'Financial Aid', 'Student Support Desk', 'Yesterday', ['Awaiting Student', 'warning']],
      ['SUP-479', 'Tanvi Deshpande · EC25B099', 'Accessibility', 'Dr. Nandita Rao', '22 Nov 2026', ['In Progress', 'info']],
      ['SUP-471', 'Dev Malhotra · CS22B012', 'Wellness Check-in', 'Counselling Cell', '19 Nov 2026', ['Closed', 'success']],
    ]
  },
  'e-library': {
    title: 'E-Library', subtitle: 'Manage digital resources, collections, and access permissions.', action: 'Add Resource', icon: 'book-plus', columns: ['Resource', 'Type', 'Collection', 'Access', 'Updated', 'Status'], rows: [
      ['Operating Systems · 4th Ed.', 'E-Book', 'Computer Science', 'All Students', '24 Nov 2026', ['Published', 'success']],
      ['NEP 2020 Implementation Guide', 'Document', 'Academic Office', 'Administrators', '21 Nov 2026', ['Restricted', 'warning']],
      ['Digital Signal Processing Lectures', 'Video Series', 'Electronics', 'EC Department', '18 Nov 2026', ['Published', 'success']],
      ['Engineering Research Journals 2026', 'Journal Pack', 'Research', 'Faculty & PhD', '12 Nov 2026', ['Review', 'info']],
    ]
  },
  'examination-management': {
    title: 'Examination Management', subtitle: 'Coordinate schedules, hall allocation, and result workflows.', action: 'Schedule Exam', icon: 'file-plus-2', columns: ['Examination', 'Date', 'Sessions', 'Halls', 'Coordinator', 'Status'], rows: [
      ['End-Semester Theory Exams', '02 Dec – 14 Dec 2026', '28', '14 / 14', 'Examination Cell', ['Scheduled', 'success']],
      ['Practical Viva · CSE', '16 Dec 2026', '12', '6 / 8', 'Dr. Meera Deshpande', ['Allocation Pending', 'warning']],
      ['Backlog Examination', '19 Dec 2026', '8', '4 / 4', 'Examination Cell', ['Draft', 'info']],
      ['Internal Assessment 2', 'Completed', '142', '—', 'Department Offices', ['Results Due', 'danger']],
    ]
  },
};

const state = { sidebarCollapsed: false, searchOpen: false, theme: window.CampusPulseTheme.getTheme(), profileOpen: false, activeModule: 'dashboard', query: '', tableQuery: '', modal: null, snapshot: null, records: [], statusFilter: '', message: '', busy: false };
window.addEventListener('campuspulse:theme-change', (event) => { state.theme = event.detail.theme; });

function icon(name, size = 16) { return `<i data-lucide="${name}" width="${size}" height="${size}"></i>`; }
function esc(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function initials(name) { return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(); }
function activeIdFromPath() {
  let path = window.location.pathname
  if (portalBase && (path === portalBase || path.startsWith(`${portalBase}/`))) path = path.slice(portalBase.length) || '/'
  path = path.replace(/\/$/, '') || '/'
  return modules.find(m => m.path === path)?.id || 'dashboard'
}
function linkTo(id) { return portalPath(modules.find(m => m.id === id)?.path || '/'); }
function badge(label, tone = 'neutral') { return `<span class="badge ${tone}">${esc(label)}</span>`; }
function setIcons() { if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } }); }
window.__lucideReady = setIcons;

function renderShell(content, title, actions = '') {
  const active = state.activeModule;
  document.documentElement.classList.toggle('dark', state.theme === 'dark');
  document.body.innerHTML = `<div class="app">
    <aside class="sidebar ${state.sidebarCollapsed ? 'collapsed' : ''}" id="sidebar">
      <div class="sidebar-top">
        <div class="brand-row"><a href="/" class="brand"><span class="brand-mark">V</span><span class="brand-copy"><span class="brand-name">CampusPulse</span><span class="brand-subtitle">Admin Dashboard</span></span></a><button class="icon-button" id="collapse-sidebar" aria-label="Collapse sidebar">${icon('panel-left-close')}</button></div>
        <button class="search-trigger" id="open-search"><span class="search-label">${icon('search')}<span class="sidebar-label">Global Search</span></span><span class="sidebar-kbd">Ctrl K</span></button>
        <button class="new-action" id="new-action">${icon('plus')}<span class="sidebar-label">New Action</span></button>
        <nav class="nav" aria-label="Primary Navigation">
          ${modules.slice(0, 13).map(m => `<a class="nav-item ${active === m.id ? 'active' : ''}" href="${portalPath(m.path)}">${icon(m.icon)}<span class="sidebar-label">${m.label}</span></a>`).join('')}
          <div class="nav-separator"></div>
          <a class="nav-item ai ${active === 'agentic-workflow' ? 'active' : ''}" href="${portalPath('/agentic-workflow')}"><span class="nav-leading">${icon('workflow')}<span class="sidebar-label">Agentic Workflow</span></span><span class="ai-chip sidebar-label">AI</span></a>
        </nav>
      </div>
      <div class="sidebar-bottom">
        <div class="profile-popover ${state.profileOpen ? 'open' : ''}" id="profile-popover"><a href="${portalPath('/admin-settings')}">${icon('user')} My Profile</a><a href="${portalPath('/admin-settings')}">${icon('settings')} Account Settings</a><a href="${portalPath('/admin-settings')}">${icon('shield-check')} Manage Permissions</a><button id="lock-session">${icon('log-out')} Logout</button></div>
        <button class="profile-button" id="profile-button"><span class="brand"><span class="profile-avatar">${esc(initials(profileName()))}</span><span class="profile-copy"><span class="profile-name">${esc(profileName())}</span><span class="profile-role">${portalAuth?.demo ? 'Anonymous demo · sample data' : 'Verified administrator'}</span></span></span>${icon('settings')}</button>
      </div>
    </aside>
    <div class="workspace">
      ${portalAuth?.demo ? '<aside class="demo-access-banner" role="status">ANONYMOUS DEMO · Sample data only; no Supabase session, live records, or backend changes.</aside>' : ''}
      <header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" id="mobile-menu" aria-label="Open navigation">${icon('menu')}</button><h1 class="page-title">${esc(title)}</h1>${title === 'Admin Dashboard' ? '<span class="context-chip">AY 2026-27 · Odd Sem</span>' : ''}</div><div class="topbar-actions">${actions}<button class="icon-button" id="theme-toggle" data-theme-toggle aria-label="Switch to dark mode" aria-pressed="false"><span data-theme-icon aria-hidden="true">${state.theme === 'dark' ? '☀' : '☾'}</span></button></div></header>
      ${content}
    </div>
  </div><div class="modal-backdrop" id="modal-backdrop"></div><div class="toast-stack" id="toast-stack"></div>`;
  bindShell(); setIcons();
}

function bindShell() {
  document.getElementById('collapse-sidebar')?.addEventListener('click', () => { state.sidebarCollapsed = !state.sidebarCollapsed; render(); });
  document.getElementById('mobile-menu')?.addEventListener('click', () => document.getElementById('sidebar')?.classList.toggle('mobile-open'));
  document.getElementById('open-search')?.addEventListener('click', openSearch);
  document.getElementById('new-action')?.addEventListener('click', () => state.activeModule === 'faculty-management' ? openInviteModal() : openCreateModal(state.activeModule));
  document.getElementById('profile-button')?.addEventListener('click', () => { state.profileOpen = !state.profileOpen; document.getElementById('profile-popover')?.classList.toggle('open', state.profileOpen); });
  document.getElementById('lock-session')?.addEventListener('click', async () => { if (portalAuth?.demo) { sessionStorage.removeItem('campuspulse:admin-demo'); location.replace('/'); return; } try { const { error } = await portalAuth.client.auth.signOut(); if (error) throw error; location.replace('/'); } catch (error) { showToast(error.message || 'Unable to sign out.'); } });
  document.getElementById('modal-backdrop')?.addEventListener('click', e => { if (e.target.id === 'modal-backdrop') closeModal(); });
}

function render() {
  state.activeModule = activeIdFromPath();
  if (state.activeModule === 'dashboard') renderDashboard();
  else if (state.activeModule === 'agentic-workflow') renderWorkflow();
  else if (state.activeModule === 'admin-settings') renderSettings();
  else if (state.activeModule === 'student-records') renderStudents();
  else if (state.activeModule === 'faculty-management') renderFaculty();
  else if (state.activeModule === 'notices-announcements') renderNotices();
  else if (state.activeModule === 'assignment-management') renderAssignments();
  else if (state.activeModule === 'course-information') renderCourses();
  else renderDataset(state.activeModule);
}

function snapshotData() {
  return state.snapshot || DEMO_SNAPSHOT;
}
const live = () => Boolean(portalAuth?.client) && !portalAuth?.demo;
function liveTable(columns, rows, emptyText) {
  if (!rows.length) return `<section class="card table-card"><p class="subhead">${esc(emptyText)}</p></section>`;
  return `<section class="card table-card"><div class="table-scroll"><table><thead><tr>${columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
function livePage({ title, eyebrow, subtitle, actions = '', body = '' }) {
  const notice = portalAuth?.demo
    ? '<p class="card-note" role="status">Anonymous demo · sample rows only; nothing is read from or written to Supabase.</p>'
    : '<p class="card-note" role="status">Live Supabase data · every row is scoped to your college by row level security.</p>';
  const message = state.message ? `<p class="card-note" role="status">${esc(state.message)}</p>` : '';
  const content = `<main class="main"><section class="page-intro"><div><p class="eyebrow">${esc(eyebrow)}</p><h2 class="headline">${esc(title)}</h2><p class="subhead">${esc(subtitle)}</p></div><div class="inline-actions">${actions}</div></section>${notice}${message}${body}</main>`;
  renderShell(content, title);
}
function renderDashboard() {
  const snap = snapshotData();
  const students = snap.profiles.filter(p => p.role === 'student');
  const staff = snap.profiles.filter(p => p.role !== 'student');
  const enrolments = snap.courses.reduce((total, course) => total + (course.course_enrollments || []).filter(r => r.status === 'active').length, 0);
  const pending = snap.submissions.filter(s => s.status === 'submitted').length;
  const kpis = [
    ['Students', String(students.length), live() ? 'profiles.role = student' : 'sample rows', 'graduation-cap', 'success'],
    ['Faculty & admins', String(staff.length), live() ? 'profiles.role ≠ student' : 'sample rows', 'users', ''],
    ['Courses', String(snap.courses.length), 'public.courses', 'layers', ''],
    ['Active enrolments', String(enrolments), 'public.course_enrollments', 'clipboard-list', ''],
    ['Assignments', String(snap.assignments.length), `${pending} submission(s) to grade`, 'file-check-2', pending ? 'warning' : ''],
    ['Notices', String(snap.notices.length), 'public.notices', 'megaphone', 'success'],
  ];
  const noticeRows = snap.notices.slice(0, 5).map(n => [`<strong>${esc(n.title)}</strong>`, esc(n.audience), esc(n.author?.full_name || 'CampusPulse'), esc(new Date(n.published_at).toLocaleDateString())]);
  const assignmentRows = snap.assignments.slice(0, 5).map(a => [`<strong>${esc(a.title)}</strong>`, esc(a.course?.code || '—'), esc(new Date(a.due_at).toLocaleDateString()), badge(new Date(a.due_at).getTime() < Date.now() ? 'Closed' : 'Open', new Date(a.due_at).getTime() < Date.now() ? 'neutral' : 'success')]);
  renderShell(`<main class="main">
    <section class="page-intro"><div><p class="eyebrow">CAMPUSPULSE COLLEGE MANAGEMENT</p><h2 class="headline">Admin Dashboard</h2><p class="subhead">${live() ? 'Live institution snapshot from your Supabase project.' : 'Anonymous demo · sample rows only.'}</p></div><div class="inline-actions"><a class="secondary" href="${portalPath('/student-records')}">${icon('user-plus', 14)}Students</a><a class="secondary" href="${portalPath('/faculty-management')}">${icon('users', 14)}Invite Faculty/Admin</a><a class="secondary" href="${portalPath('/notices-announcements')}">${icon('megaphone', 14)}Create Notice</a><a class="secondary" href="${portalPath('/agentic-workflow')}">${icon('sparkles', 14)}Ask AI Agent</a></div></section>
    ${portalAuth?.demo ? '<p class="card-note" role="status">Anonymous demo · sample rows only; nothing is read from or written to Supabase.</p>' : '<p class="card-note" role="status">Live Supabase data · scoped to your college by row level security.</p>'}
    ${state.message ? `<p class="card-note" role="status">${esc(state.message)}</p>` : ''}
    <section class="kpi-grid">${kpis.map(([label, value, caption, ico, tone]) => `<article class="card low kpi-card"><div class="kpi-top"><span>${esc(label)}</span>${icon(ico, 16)}</div><p class="kpi-value">${esc(value)}</p><p class="kpi-caption ${tone}">${esc(caption)}</p></article>`).join('')}</section>
    <section class="detail-grid"><article class="card"><div class="card-header"><h3 class="card-title">Recent notices</h3><a class="info" href="${portalPath('/notices-announcements')}">Manage →</a></div>${noticeRows.length ? `<div class="table-scroll"><table><thead><tr><th>Notice</th><th>Audience</th><th>Author</th><th>Published</th></tr></thead><tbody>${noticeRows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="subhead">No notices yet.</p>'}</article><article class="card"><div class="card-header"><h3 class="card-title">Assignments</h3><a class="info" href="${portalPath('/assignment-management')}">Overview →</a></div>${assignmentRows.length ? `<div class="table-scroll"><table><thead><tr><th>Assignment</th><th>Course</th><th>Due</th><th>Status</th></tr></thead><tbody>${assignmentRows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="subhead">No assignments yet.</p>'}</article></section>
    <section class="card"><div class="card-header"><h3 class="card-title">Not modelled yet</h3><span class="card-note">No fabricated figures</span></div><p class="subhead">Fees, scholarships, grievances, examinations, e-library and timetable modules have no schema tables in this build, so this dashboard shows no numbers for them instead of sample data. Those pages remain clearly labelled sample views.</p></section>
  </main>`, 'Admin Dashboard', `<a class="primary" href="${portalPath('/agentic-workflow')}">${icon('sparkles', 14)}<span>Ask AI Agent</span></a>`);
  document.querySelectorAll('[data-toast]').forEach(el => el.addEventListener('click', () => showToast(el.dataset.toast)));
}

function renderStudents() {
  const snap = snapshotData();
  const students = snap.profiles.filter(p => p.role === 'student');
  const rows = students.map(s => [
    `<strong>${esc(s.full_name || 'Unnamed student')}</strong>`,
    badge('student', 'neutral'),
    `<span class="mono">${esc(String(s.id).slice(0, 8))}</span>`,
    esc(s.college_id || 'not assigned'),
    `<button class="secondary live-enrol" data-student="${esc(s.id)}">${icon('user-plus', 13)}Enrol in course</button>`,
  ]);
  livePage({
    title: 'Student Records',
    eyebrow: 'CAMPUSPULSE OPERATIONS',
    subtitle: `${students.length} student profile(s) visible in your college.`,
    actions: `<a class="primary" href="${portalPath('/faculty-management')}">${icon('users', 14)}Invite Faculty/Admin</a>`,
    body: liveTable(['Student', 'Role', 'Profile', 'College', 'Enrolment'], rows, 'No student profiles are visible yet. Seed demo data or invite students.') +
      '<section class="card"><div class="card-header"><h3 class="card-title">Enrolment is admin or faculty driven</h3></div><p class="subhead">Students cannot self-enrol: row level security only allows a trusted administrator in the same college, or the faculty member who owns the course, to create public.course_enrollments rows. Use “Enrol in course” to place a student on a course.</p></section>',
  });
  document.querySelectorAll('.live-enrol').forEach(button => button.addEventListener('click', () => openEnrolModal(button.dataset.student)));
}

function renderFaculty() {
  const snap = snapshotData();
  const staff = snap.profiles.filter(p => p.role !== 'student');
  const rows = staff.map(person => [
    `<strong>${esc(person.full_name || 'Unnamed member')}</strong>`,
    badge(person.role, person.role === 'admin' ? 'success' : 'info'),
    String(snap.courses.filter(course => course.faculty_id === person.id).length),
    `<span class="mono">${esc(String(person.id).slice(0, 8))}</span>`,
    `<button class="secondary live-role" data-person="${esc(person.id)}">${icon('shield-check', 13)}Change role</button>`,
  ]);
  livePage({
    title: 'Faculty Management',
    eyebrow: 'CAMPUSPULSE OPERATIONS',
    subtitle: `${staff.length} faculty/admin profile(s) visible in your college.`,
    actions: `<button class="primary" id="invite-faculty">${icon('user-plus', 14)}Invite Faculty/Admin</button>`,
    body: liveTable(['Member', 'Role', 'Courses', 'Profile', 'Access'], rows, 'No faculty profiles are visible yet. Use Invite to send a trusted invitation.') +
      '<section class="card"><div class="card-header"><h3 class="card-title">Trusted role changes</h3></div><p class="subhead">Role changes call admin_set_role, which re-checks your admin role, keeps the college boundary and writes an audit row. </p></section>',
  });
  document.getElementById('invite-faculty')?.addEventListener('click', () => openInviteModal());
  document.querySelectorAll('.live-role').forEach(button => button.addEventListener('click', () => openRoleModal(button.dataset.person)));
}

const STATUS_TONES = { Paid: 'success', Approved: 'success', Published: 'success', Resolved: 'success', Closed: 'success', Scheduled: 'success', Open: 'info', Draft: 'warning', Pending: 'warning', 'Due Soon': 'warning', 'Under Review': 'info', Escalated: 'danger' };
function statusTone(status) { return STATUS_TONES[status] || 'neutral'; }

function datasetRecords(id) { return (state.records || []).filter(record => record.module === id); }

function exportCsv(filename, rows) {
  const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  const url = link.href;
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`${filename} downloaded.`, false);
}

function openRecordModal(moduleId) {
  const config = datasets[moduleId];
  openModal(`<div class="modal-header"><h3 class="modal-title">${esc(config.action)}</h3><button class="icon-button" data-close-modal>${icon('x')}</button></div>
    <form id="record-form" class="form-grid">
      <label class="form-field full"><span class="form-label">Title</span><input class="field" name="title" maxlength="200" required placeholder="What is this record?" /></label>
      <label class="form-field"><span class="form-label">Status</span><input class="field" name="status" maxlength="40" value="Open" /></label>
      <label class="form-field full"><span class="form-label">Details</span><textarea class="field" name="details" rows="3" maxlength="10000" placeholder="Owner, amount, room, dates, anything the office needs."></textarea></label>
      <div class="modal-footer" style="grid-column:1/-1"><button class="primary" type="submit">Save record</button></div>
    </form>`);
  document.getElementById('record-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await createModuleRecord(portalAuth.client, portalAuth.profile, {
        module: moduleId,
        title: form.title.value,
        status: form.status.value,
        details: form.details.value,
      });
      closeModal();
      showToast(`${config.title} record saved.`, false);
      await refresh();
    } catch (error) {
      showToast(error.message || 'The record could not be saved.');
      button.disabled = false;
    }
  });
}

function renderDataset(id) {
  const config = datasets[id];
  const records = datasetRecords(id);
  const query = (state.tableQuery || '').trim().toLowerCase();
  const statusFilter = state.statusFilter || '';
  const filtered = records
    .filter(record => !statusFilter || record.status === statusFilter)
    .filter(record => !query || `${record.title} ${record.status} ${record.details}`.toLowerCase().includes(query));
  const statuses = [...new Set(records.map(record => record.status))].sort();

  const table = filtered.length
    ? `<section class="card table-card"><div class="table-scroll"><table><thead><tr><th>Record</th><th>Status</th><th>Details</th><th>Created</th><th class="actions-cell">Actions</th></tr></thead><tbody>${filtered.map(record => `<tr><td><strong>${esc(record.title)}</strong></td><td>${badge(record.status, statusTone(record.status))}</td><td>${esc(record.details || '—')}</td><td>${esc(new Date(record.created_at).toLocaleDateString())}</td><td class="actions-cell"><button class="icon-small" data-delete="${esc(record.id)}" aria-label="Delete ${esc(record.title)}">${icon('trash-2', 14)}</button></td></tr>`).join('')}</tbody></table></div><div class="table-footer"><span>Showing ${filtered.length} of ${records.length} records</span></div></section>`
    : `<section class="card table-card"><p class="subhead">${records.length ? 'No records match your search.' : `No ${esc(config.title.toLowerCase())} records in your college yet. Use “${esc(config.action)}” to add the first one.`}</p></section>`;

  const content = `<main class="main"><section class="page-intro"><div><p class="eyebrow">CAMPUSPULSE OPERATIONS</p><h2 class="headline">${esc(config.title)}</h2><p class="subhead">${esc(config.subtitle)}</p></div><div class="inline-actions"><button class="secondary" id="export-csv">${icon('download', 14)}Export CSV</button><button class="primary" id="record-create">${icon(config.icon, 14)}${esc(config.action)}</button></div></section>
    <p class="card-note" role="status">Live Supabase data · public.module_records, scoped to your college by row level security.</p>
    <section class="toolbar"><div class="search-box">${icon('search', 16)}<input class="field" id="table-search" value="${esc(state.tableQuery || '')}" placeholder="Search ${esc(config.title.toLowerCase())}..." /></div><select class="select" id="status-filter" aria-label="Filter by status"><option value="">All statuses</option>${statuses.map(status => `<option value="${esc(status)}"${status === statusFilter ? ' selected' : ''}>${esc(status)}</option>`).join('')}</select></section>
    ${table}</main>`;

  renderShell(content, config.title);
  document.getElementById('table-search')?.addEventListener('input', event => { state.tableQuery = event.target.value; renderDataset(id); });
  document.getElementById('status-filter')?.addEventListener('change', event => { state.statusFilter = event.target.value; renderDataset(id); });
  document.getElementById('record-create')?.addEventListener('click', () => openRecordModal(id));
  document.getElementById('export-csv')?.addEventListener('click', () => exportCsv(`${id}.csv`, [['Title', 'Status', 'Details', 'Created'], ...filtered.map(record => [record.title, record.status, record.details || '', new Date(record.created_at).toISOString()])]));
  document.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await deleteModuleRecord(portalAuth.client, button.dataset.delete);
      showToast('Record deleted.', false);
      await refresh();
    } catch (error) {
      showToast(error.message || 'The record could not be deleted.');
      button.disabled = false;
    }
  }));
}

function renderWorkflow() {
  const content = `<div class="workflow-layout"><section class="workflow-main"><div class="agent-strip"><span class="agent-label">Active Agents:</span>${['Student Data','Academic','Scholarship','Grievance','Examination','Notice'].map(a => `<span class="agent-chip">${a}</span>`).join('')}</div><div class="workflow-center"><div class="workflow-welcome"><span class="workflow-icon">${icon('workflow', 24)}</span><h2>What administrative workflow should we run?</h2><p>Instructions are decomposed across specialized agents. Consequential actions always pause for your approval.</p></div><div id="workflow-feed"><div class="prompt-grid">${[['Attendance < 75% Audit','Student Data + Notice Agents','Find all students with attendance below 75% and prepare notification drafts.'],['Scholarship Eligibility Match','Scholarship + Student Data Agents','Identify students who may qualify for available NSP and state scholarships.'],['Grievance Escalation Report','Grievance Agent · SLA > 7 days','Find grievances unresolved for more than seven days and prepare an escalation report.'],['Clash-Free CSE Timetable','Academic + Examination Agents','Generate a clash-free timetable for the Computer Science department.']].map(([t, s, p]) => `<button class="prompt-card workflow-prompt" data-prompt="${p}"><strong>${t}</strong><span>${s}</span></button>`).join('')}</div></div></div><form class="workflow-input" id="workflow-form"><textarea id="ai-prompt" placeholder="Instruct CampusPulse AI (e.g., 'Draft an official notice for the upcoming semester examinations' or 'Show students who have not submitted assignments')..."></textarea><div class="workflow-input-bottom"><span class="safety-note">${icon('shield-check', 14)}AI never deletes records or publishes notices without approval</span><button class="primary" type="submit">Run Workflow ${icon('arrow-up', 14)}</button></div></form></section><aside class="workflow-history"><div class="card-header"><h3 class="card-title">Workflow History & Audit</h3><span class="card-note">Sample history · not live</span></div><div class="history-list"><div class="history-item"><div class="history-head"><p class="history-title">Department Performance Summary</p>${badge('Completed','success')}</div><p class="history-meta">Student Data Agent · Approved by Dr. Rao</p><p class="card-note" style="margin-top:6px">24 Nov 2026 · 09:42 AM</p></div><div class="history-item"><div class="history-head"><p class="history-title">Exam Hall Availability Check</p>${badge('Completed','success')}</div><p class="history-meta">Examination Agent · 14 halls verified</p><p class="card-note" style="margin-top:6px">23 Nov 2026 · 04:15 PM</p></div><div class="history-item"><div class="history-head"><p class="history-title">MahaDBT Batch 08 Verification</p>${badge('Awaiting Approval','warning')}</div><p class="history-meta">Scholarship Agent · 18 applications matched</p><p class="card-note" style="margin-top:6px">22 Nov 2026 · 02:08 PM</p></div></div></aside></div>`;
  renderShell(content, 'Agentic Workflow Orchestrator', `<span class="context-chip">Local demo · no backend or workflow execution</span>`);
  document.querySelectorAll('.workflow-prompt').forEach(button => button.addEventListener('click', () => runWorkflow(button.dataset.prompt)));
  document.getElementById('workflow-form')?.addEventListener('submit', e => { e.preventDefault(); const prompt = document.getElementById('ai-prompt').value.trim(); if (prompt) runWorkflow(prompt); else showToast('Describe the workflow you want CampusPulse AI to run.'); });
}

async function runWorkflow(prompt) {
  const feed = document.getElementById('workflow-feed');
  if (!feed) return;
  if (portalAuth?.demo || !portalAuth?.client) {
    feed.innerHTML = `<div class="execution-card" role="status"><div class="execution-row"><p class="execution-title">${esc(prompt)}</p>${badge('Demo only', 'warning')}</div><p class="execution-copy">Anonymous demo mode never calls the backend. Sign in with an admin account to use the deployed ai-assistant function.</p></div>`;
    return;
  }
  feed.innerHTML = `<div class="execution-card" role="status"><div class="execution-row"><p class="execution-title">${esc(prompt)}</p>${badge('Thinking', 'info')}</div><p class="execution-copy">Calling the ai-assistant Edge function with your session token…</p></div>`;
  try {
    const answer = await askAssistant(portalAuth.client, prompt);
    feed.innerHTML = `<div class="execution-card" role="status"><div class="execution-row"><p class="execution-title">${esc(prompt)}</p>${badge('Advisory only', 'success')}</div><p class="execution-copy">${esc(answer || 'The assistant returned no text.')}</p><p class="card-note">Generated advice is advisory. No record was changed, published, or approved.</p></div>`;
  } catch (error) {
    feed.innerHTML = `<div class="execution-card" role="status"><div class="execution-row"><p class="execution-title">${esc(prompt)}</p>${badge('Unavailable', 'warning')}</div><p class="execution-copy">${esc(error.message || 'The assistant is unavailable.')}</p></div>`;
  }
}

function renderSettings() {
  const profile = portalAuth?.profile || {};
  const content = `<main class="main"><section class="page-intro"><div><p class="eyebrow">ADMINISTRATION · ACCOUNT</p><h2 class="headline">Admin Settings</h2><p class="subhead">Your own CampusPulse profile. Role and college are server-controlled and cannot be edited from this screen.</p></div></section>
    <section class="detail-grid"><article class="card"><div class="card-header"><h3 class="card-title">Profile</h3>${icon('user-cog', 16)}</div>
      <form id="profile-form" class="form-grid">
        <label class="form-field full"><span class="form-label">Full name</span><input class="field" name="full_name" maxlength="160" required value="${esc(profile.full_name || '')}" /></label>
        <label class="form-field full"><span class="form-label">Bio</span><textarea class="field" name="bio" rows="3" maxlength="2000">${esc(profile.bio || '')}</textarea></label>
        <div class="form-field"><span class="form-label">Email</span><p class="subhead" style="margin:0">${esc(portalAuth?.user?.email || '—')}</p></div>
        <div class="form-field"><span class="form-label">Role</span><p class="subhead" style="margin:0">${esc(profile.role || 'admin')}</p></div>
        <div class="form-field full"><span class="form-label">College</span><p class="subhead mono" style="margin:0">${esc(profile.college_id || 'not assigned')}</p></div>
        <div class="modal-footer" style="grid-column:1/-1"><button class="primary" type="submit">${icon('save', 14)}Save changes</button></div>
      </form></article>
      <article class="card"><div class="card-header"><h3 class="card-title">Session</h3>${icon('shield-check', 16)}</div>
        <p class="subhead">Signed in with Supabase Auth as ${esc(portalAuth?.user?.email || 'an administrator')}. The session token lives in this browser; signing out clears it.</p>
        <button class="secondary" id="settings-sign-out">Sign out</button></article></section>
  </main>`;
  renderShell(content, 'Admin Settings');
  document.getElementById('profile-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const saved = await updateOwnProfile(portalAuth.client, profile.id, { full_name: form.full_name.value, bio: form.bio.value });
      portalAuth.profile = { ...profile, ...saved };
      showToast('Profile saved.', false);
      renderSettings();
    } catch (error) {
      showToast(error.message || 'Your profile could not be saved.');
      button.disabled = false;
    }
  });
  document.getElementById('settings-sign-out')?.addEventListener('click', async () => {
    try {
      const { error } = await portalAuth.client.auth.signOut();
      if (error) throw error;
      location.replace('/');
    } catch (error) { showToast(error.message || 'Unable to sign out.'); }
  });
}
function openStudent(person) {
  openModal(`<div class="modal-header"><div class="person"><span class="person-avatar" style="width:44px;height:44px">${esc(initials(person.full_name || 'Student'))}</span><span><h3 class="modal-title">${esc(person.full_name || 'Unnamed student')}</h3><p class="card-note">${esc(person.role)} profile</p></span></div><button class="icon-button" data-close-modal>${icon('x')}</button></div><div class="modal-body"><div class="detail-grid"><div class="info-block"><p class="info-label">Profile ID</p><p class="info-value mono">${esc(person.id)}</p></div><div class="info-block"><p class="info-label">Role</p><p class="info-value">${esc(person.role)}</p></div><div class="info-block"><p class="info-label">College</p><p class="info-value mono">${esc(person.college_id || 'not assigned')}</p></div><div class="info-block"><p class="info-label">Joined</p><p class="info-value">${esc(person.created_at ? new Date(person.created_at).toLocaleDateString() : '—')}</p></div></div><p class="card-note">Role and college are server-controlled. Use Change role in Faculty Management to update access.</p></div>`);
}

function openCreateModal(moduleId) {
  if (moduleId === 'faculty-management') return openInviteModal();
  const subject = modules.find(m => m.id === moduleId)?.label || 'This module';
  openInfoModal(`${subject} · no live form`, 'Notices, courses, enrolment, invitations and role changes are schema-backed and live. This module has no table in the current schema, so no form is offered rather than a form that cannot save.');
}
async function openInviteModal() {
  if (!portalAuth?.client || portalAuth?.demo) {
    showToast('Sign in with a verified administrator account to manage members.');
    return;
  }
  const members = snapshotData().profiles
    .map(person => `<option value="${esc(person.id)}">${esc(person.full_name || person.id)} · ${esc(person.role)}</option>`)
    .join('');
  openModal(`<div class="modal-header"><div><h3 class="modal-title">Add a faculty or admin member</h3><p class="card-note">Accounts sign themselves up; you grant the role.</p></div><button class="icon-button" data-close-modal aria-label="Close">${icon('x')}</button></div><div class="modal-body"><p class="subhead">Portal accounts are created by the person themselves with their college email at the sign-up page, because creating an account requires the Supabase admin API and a service key this console must never hold. As soon as they appear in your college, grant them faculty or admin access here.</p><label class="form-field full"><span class="form-label">Member</span><select class="select" id="invite-member">${members || '<option value="">No members in your college yet</option>'}</select></label><label class="form-field"><span class="form-label">Grant role</span><select class="select" id="invite-role"><option value="faculty">Faculty</option><option value="admin">Administrator</option><option value="student">Student</option></select></label><label class="form-field full"><span class="form-label">Reason</span><input class="field" id="invite-reason" maxlength="2000" placeholder="Recorded in role_change_audit" /></label><p class="card-note" id="invite-note">Only accounts already inside your college can be granted access.</p><div class="modal-footer"><button class="secondary" data-close-modal>Cancel</button><button class="primary" id="grant-invite-role">Grant access</button></div></div>`);
  document.getElementById('grant-invite-role')?.addEventListener('click', async (event) => {
    const member = document.getElementById('invite-member')?.value;
    const role = document.getElementById('invite-role')?.value;
    const note = document.getElementById('invite-note');
    if (!member) { if (note) note.textContent = 'There is no member to grant access to yet.'; return; }
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await grantRole(portalAuth.client, { userId: member, role, reason: document.getElementById('invite-reason')?.value || '' });
      closeModal();
      showToast(`Access granted: ${role}.`, false);
      await refresh();
    } catch (error) {
      if (note) note.textContent = error.message || 'The role change failed.';
      button.disabled = false;
    }
  });
}

function openInfoModal(title, text) { openModal(`<div class="modal-header"><h3 class="modal-title">${title}</h3><button class="icon-button" data-close-modal>${icon('x')}</button></div><div class="modal-body"><p class="subhead">${text}</p><div class="approval"><p class="approval-title">Dashboard widgets</p><p class="approval-meta">KPIs · Analytics · Activity · Approvals · System Health</p></div><div class="modal-footer"><button class="primary" data-close-modal>Done</button></div></div>`); }
function openModal(inner) { const backdrop = document.getElementById('modal-backdrop'); if (!backdrop) return; backdrop.innerHTML = `<div class="modal">${inner}</div>`; backdrop.classList.add('open'); backdrop.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal)); backdrop.querySelector('[data-save-modal]')?.addEventListener('click', () => { closeModal(); showToast('Local demo form closed. No record was saved or changed.'); }); setIcons(); }
function closeModal() { document.getElementById('modal-backdrop')?.classList.remove('open'); }
function openSearch() { openModal(`<div class="modal-header"><input class="field" id="global-search-input" placeholder="Jump to any module or record..." autofocus /><button class="secondary" data-close-modal>ESC</button></div><div class="search-results">${modules.map(m => `<a href="${portalPath(m.path)}" class="search-result">${icon(m.icon)}<span><strong>${m.label}</strong><small class="muted" style="display:block">Open module</small></span></a>`).join('')}</div>`); }
function showToast(message, localOnly = !live()) { const stack = document.getElementById('toast-stack'); if (!stack) return; const toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); toast.innerHTML = `${icon('info', 16)}<span>${esc(message)}${localOnly ? ' Local demo only—no data was saved, changed, sent, imported, exported, synced, or approved.' : ''}</span>`; stack.appendChild(toast); setIcons(); setTimeout(() => toast.remove(), 3200); }


// ---------------------------------------------------------------------------
// Live notice, course and enrolment management. All writes go to Supabase under
// the signed-in administrator's JWT; RLS re-checks role, college and ownership.
// ---------------------------------------------------------------------------
function renderNotices() {
  const snap = snapshotData();
  const rows = snap.notices.map(notice => [
    `<strong>${esc(notice.title)}</strong><span class="card-note" style="display:block">${esc(String(notice.body).slice(0, 120))}</span>`,
    badge(notice.audience, notice.audience === 'everyone' ? 'success' : 'info'),
    esc(notice.author?.full_name || 'CampusPulse'),
    esc(new Date(notice.published_at).toLocaleString()),
  ]);
  livePage({
    title: 'Notices & Announcements',
    eyebrow: 'CAMPUSPULSE OPERATIONS',
    subtitle: `${snap.notices.length} notice(s) in your college. Publishing writes to public.notices immediately.`,
    actions: '',
    body: `<section class="card"><div class="card-header"><h3 class="card-title">Publish a notice</h3><span class="card-note">Visible to your college by audience</span></div><form id="admin-notice-form" class="form-grid"><label class="form-field full"><span class="form-label">Title</span><input class="field" name="title" maxlength="200" required placeholder="e.g. End-semester examination schedule" /></label><label class="form-field full"><span class="form-label">Body</span><textarea class="field" name="body" rows="4" maxlength="20000" required placeholder="What should the campus know?"></textarea></label><label class="form-field"><span class="form-label">Audience</span><select class="select" name="audience"><option value="students">Students</option><option value="faculty">Faculty</option><option value="college">Whole college</option><option value="everyone">Everyone</option></select></label><div class="modal-footer" style="grid-column:1/-1"><button class="primary" type="submit">Publish notice</button></div></form></section>` +
      liveTable(['Notice', 'Audience', 'Author', 'Published'], rows, 'No notices yet. Publish the first one above.'),
  });
  document.getElementById('admin-notice-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!live()) { showToast('Sign in with a verified administrator account to publish notices.'); return; }
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await publishNotice(portalAuth.client, portalAuth.profile, {
        title: String(values.get('title')).trim(),
        body: String(values.get('body')).trim(),
        audience: String(values.get('audience')),
      });
      state.message = 'Notice published to Supabase.';
      await refresh();
    } catch (error) {
      state.message = error.message || 'The notice could not be published.';
      render();
    } finally { button.disabled = false; }
  });
}

function renderCourses() {
  const snap = snapshotData();
  const facultyOptions = snap.profiles.filter(p => p.role !== 'student').map(p => `<option value="${esc(p.id)}">${esc(p.full_name || p.id)}</option>`).join('');
  const studentOptions = snap.profiles.filter(p => p.role === 'student').map(p => `<option value="${esc(p.id)}">${esc(p.full_name || p.id)}</option>`).join('');
  const rows = snap.courses.map(course => {
    const enrolled = (course.course_enrollments || []).filter(r => r.status === 'active').length;
    return [
      `<span class="mono">${esc(course.code)}</span>`,
      `<strong>${esc(course.title)}</strong>`,
      esc(course.term),
      esc(course.faculty?.full_name || 'unassigned'),
      String(enrolled),
      `<form class="enrol-inline" data-course="${esc(course.id)}" style="display:flex;gap:6px;align-items:center"><select class="select" name="student_id" style="max-width:190px" required>${studentOptions || '<option value="">No students</option>'}</select><button class="secondary" type="submit" ${studentOptions ? '' : 'disabled'}>Enrol</button></form>`,
    ];
  });
  livePage({
    title: 'Course Information',
    eyebrow: 'CAMPUSPULSE OPERATIONS',
    subtitle: `${snap.courses.length} course(s) in your college, with live enrolment counts.`,
    actions: '',
    body: `<section class="card"><div class="card-header"><h3 class="card-title">Add a course</h3><span class="card-note">Assigns an existing faculty member in your college</span></div><form id="admin-course-form" class="form-grid"><label class="form-field"><span class="form-label">Course code</span><input class="field" name="code" maxlength="40" required placeholder="CS301" /></label><label class="form-field"><span class="form-label">Title</span><input class="field" name="title" maxlength="200" required placeholder="Data Structures & Algorithms" /></label><label class="form-field"><span class="form-label">Term</span><input class="field" name="term" maxlength="40" required value="Odd 2026-27" /></label><label class="form-field"><span class="form-label">Faculty</span><select class="select" name="faculty_id" required>${facultyOptions || '<option value="">No faculty profile</option>'}</select></label><div class="modal-footer" style="grid-column:1/-1"><button class="primary" type="submit" ${facultyOptions ? '' : 'disabled'}>Create course</button></div></form></section>` +
      liveTable(['Code', 'Title', 'Term', 'Faculty', 'Enrolled', 'Enrol a student'], rows, 'No courses yet. Create the first one above.'),
  });
  document.getElementById('admin-course-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!live()) { showToast('Sign in with a verified administrator account to create courses.'); return; }
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await createCourse(portalAuth.client, portalAuth.profile, {
        code: String(values.get('code')).trim(),
        title: String(values.get('title')).trim(),
        term: String(values.get('term')).trim(),
        facultyId: String(values.get('faculty_id')),
      });
      state.message = 'Course created in Supabase.';
      await refresh();
    } catch (error) {
      state.message = error.message || 'The course could not be created.';
      render();
    } finally { button.disabled = false; }
  });
  document.querySelectorAll('form.enrol-inline').forEach(form => form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!live()) { showToast('Sign in with a verified administrator account to enrol students.'); return; }
    const studentId = String(new FormData(form).get('student_id') || '');
    if (!studentId) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await enrolStudent(portalAuth.client, form.dataset.course, studentId);
      state.message = 'Student enrolled.';
      await refresh();
    } catch (error) {
      state.message = error.message || 'The student could not be enrolled.';
      render();
    } finally { button.disabled = false; }
  }));
}

function openEnrolModal(studentId) {
  const snap = snapshotData();
  const person = snap.profiles.find(p => p.id === studentId);
  const options = snap.courses.map(course => `<option value="${esc(course.id)}">${esc(course.code)} · ${esc(course.title)}</option>`).join('');
  openModal(`<div class="modal-header"><h3 class="modal-title">Enrol ${esc(person?.full_name || 'student')}</h3><button class="icon-button" data-close-modal>${icon('x')}</button></div><div class="modal-body"><label class="form-field full"><span class="form-label">Course</span><select class="select" id="enrol-course" required>${options || '<option value="">No courses available</option>'}</select></label><p class="card-note">Enrolment rows are written to public.course_enrollments. Students cannot create these rows themselves.</p><div class="modal-footer"><button class="secondary" data-close-modal>Cancel</button><button class="primary" id="confirm-enrol" ${options ? '' : 'disabled'}>Enrol student</button></div></div>`);
  document.getElementById('confirm-enrol')?.addEventListener('click', async event => {
    const courseId = document.getElementById('enrol-course')?.value;
    if (!courseId || !live()) { showToast('Sign in with a verified administrator account to enrol students.'); return; }
    event.currentTarget.disabled = true;
    try {
      await enrolStudent(portalAuth.client, courseId, studentId);
      closeModal();
      state.message = 'Student enrolled.';
      await refresh();
    } catch (error) {
      showToast(error.message || 'The student could not be enrolled.');
      event.currentTarget.disabled = false;
    }
  });
}

function openRoleModal(userId) {
  const snap = snapshotData();
  const options = snap.profiles.map(person => `<option value="${esc(person.id)}" ${person.id === userId ? 'selected' : ''}>${esc(person.full_name || person.id)} · ${esc(person.role)}</option>`).join('');
  const target = snap.profiles.find(p => p.id === userId);
  openModal(`<div class="modal-header"><div><h3 class="modal-title">Change a trusted role</h3><p class="card-note">Calls admin_set_role, which re-checks your admin role and writes an audit row.</p></div><button class="icon-button" data-close-modal>${icon('x')}</button></div><div class="modal-body"><label class="form-field full"><span class="form-label">Member</span><select class="select" id="role-user" required>${options}</select></label><label class="form-field"><span class="form-label">New role</span><select class="select" id="role-value"><option value="student">student</option><option value="faculty">faculty</option><option value="admin">admin</option></select></label><label class="form-field full"><span class="form-label">Reason</span><input class="field" id="role-reason" maxlength="2000" placeholder="Recorded in role_change_audit" /></label><p class="card-note" id="role-note">Your admin role and the target's college are re-read inside the database function, so the browser cannot widen either.</p><div class="modal-footer"><button class="secondary" data-close-modal>Cancel</button><button class="primary" id="confirm-role">Save role</button></div></div>`);
  document.getElementById('confirm-role')?.addEventListener('click', async event => {
    if (!live()) { showToast('Sign in with a verified administrator account to change roles.'); return; }
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await grantRole(portalAuth.client, {
        userId: document.getElementById('role-user')?.value,
        role: document.getElementById('role-value')?.value,
        reason: document.getElementById('role-reason')?.value || '',
      });
      closeModal();
      state.message = 'Role updated and audited.';
      await refresh();
    } catch (error) {
      const note = document.getElementById('role-note');
      if (note) note.textContent = error.message || 'The role change failed.';
      button.disabled = false;
    }
  });
}

async function refresh() {
  if (!portalAuth) return;
  if (!live()) {
    state.snapshot = DEMO_SNAPSHOT;
    render();
    return;
  }
  try {
    state.snapshot = await loadAdminSnapshot(portalAuth.client);
    state.records = await loadModuleRecords(portalAuth.client);
  } catch (error) {
    state.message = error.message || 'Live data could not load.';
  }
  render();
}


function renderAssignments() {
  const snap = snapshotData();
  const assignmentRows = snap.assignments.map(assignment => {
    const course = assignment.course || snap.courses.find(c => c.id === assignment.course_id) || {};
    const submissions = snap.submissions.filter(s => (s.assignment?.id || s.assignment_id) === assignment.id);
    return [
      `<strong>${esc(assignment.title)}</strong>`,
      `<span class="mono">${esc(course.code || '—')}</span>`,
      esc(new Date(assignment.due_at).toLocaleString()),
      String(submissions.length),
      badge(new Date(assignment.due_at).getTime() < Date.now() ? 'Closed' : 'Open', new Date(assignment.due_at).getTime() < Date.now() ? 'neutral' : 'success'),
    ];
  });
  const submissionRows = snap.submissions.slice(0, 40).map(submission => [
    `<strong>${esc(submission.student?.full_name || 'Student')}</strong>`,
    esc(submission.assignment?.title || '—'),
    `<span class="mono">${esc(submission.assignment?.course?.code || '—')}</span>`,
    esc(submission.status),
    esc(new Date(submission.submitted_at).toLocaleString()),
    `<button class="secondary live-download" data-submission="${esc(submission.id)}">${icon('download', 13)}Open file</button>`,
  ]);
  livePage({
    title: 'Assignment Management',
    eyebrow: 'CAMPUSPULSE OPERATIONS',
    subtitle: `${snap.assignments.length} assignment(s) and ${snap.submissions.length} submission(s) in your college.`,
    actions: `<a class="secondary" href="${portalPath('/notices-announcements')}">${icon('megaphone', 14)}Publish notice</a>`,
    body: liveTable(['Assignment', 'Course', 'Due', 'Submissions', 'Status'], assignmentRows, 'No assignments published yet in your college.') +
      liveTable(['Student', 'Assignment', 'Course', 'Status', 'Submitted', 'File'], submissionRows, 'No submissions yet.') +
      '<section class="card"><div class="card-header"><h3 class="card-title">Private files</h3></div><p class="subhead">“Open file” asks Supabase Storage for a short-lived signed link, authorised by the assignments storage policies. </p></section>',
  });
  document.querySelectorAll('.live-download').forEach(button => button.addEventListener('click', async () => {
    const submission = snap.submissions.find(s => s.id === button.dataset.submission);
    if (!submission || !live()) { showToast('Sign in with a verified administrator account to download submissions.'); return; }
    const path = submission.file_path;
    if (!path) { showToast('This submission row has no stored file path.'); return; }
    button.disabled = true;
    try {
      const url = await requestSignedUrl(portalAuth.client, 'assignments', path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      showToast(error.message || 'The download link could not be created.');
    } finally { button.disabled = false; }
  }));
}

window.addEventListener('popstate', render);
document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); } if (e.key === 'Escape') closeModal(); });

document.addEventListener('click', e => {
  const link = e.target.closest('a[href]')
  if (!link || link.target === '_blank' || link.getAttribute('href').startsWith('#')) return
  const url = new URL(link.href)
  if (url.origin !== window.location.origin) return
  const isPortalPath = portalBase ? url.pathname === portalBase || url.pathname.startsWith(`${portalBase}/`) : url.pathname !== '/'
  if (!isPortalPath) return
  e.preventDefault()
  history.pushState({}, '', url.pathname)
  render()
})

state.activeModule = activeIdFromPath();
startPortalAuth({ onAuthorized: (session) => { portalAuth = session; refresh(); } });
