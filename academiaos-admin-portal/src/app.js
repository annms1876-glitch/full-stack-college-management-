import './styles.css';

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

const students = [
  { roll: 'CS23B001', name: 'Aarav Sharma', dept: 'Computer Science', course: 'B.Tech CSE', sem: 'Sem 5', attendance: '91.4%', fee: 'Paid', feeTone: 'success', email: 'aarav.sharma@vanguard.edu.in', phone: '+91 98230 44120', guardian: 'Rajesh Sharma (Father)', address: 'Kothrud, Pune 411038' },
  { roll: 'CS23B019', name: 'Rohan Kulkarni', dept: 'Computer Science', course: 'B.Tech CSE', sem: 'Sem 5', attendance: '68.2%', fee: 'Paid', feeTone: 'success', email: 'rohan.k@vanguard.edu.in', phone: '+91 97654 11209', guardian: 'Sunita Kulkarni (Mother)', address: 'Shivajinagar, Pune 411005' },
  { roll: 'EC24B044', name: 'Sneha Patil', dept: 'Electronics', course: 'B.Tech ECE', sem: 'Sem 3', attendance: '71.0%', fee: 'Pending ₹18,500', feeTone: 'warning', email: 'sneha.patil@vanguard.edu.in', phone: '+91 99210 88341', guardian: 'Prakash Patil (Father)', address: 'Baner, Pune 411045' },
  { roll: 'AI25B008', name: 'Siddharth Nair', dept: 'AI & Data Science', course: 'B.Tech AI&DS', sem: 'Sem 3', attendance: '94.8%', fee: 'Paid', feeTone: 'success', email: 'siddharth.n@vanguard.edu.in', phone: '+91 98112 77601', guardian: 'Meenakshi Nair (Mother)', address: 'Viman Nagar, Pune 411014' },
  { roll: 'ME22B087', name: 'Vikram Joshi', dept: 'Mechanical', course: 'B.Tech Mech', sem: 'Sem 7', attendance: '73.5%', fee: 'Paid', feeTone: 'success', email: 'vikram.j@vanguard.edu.in', phone: '+91 98901 33490', guardian: 'Anil Joshi (Father)', address: 'Hadapsar, Pune 411028' },
];
const faculty = [
  { id: 'FAC-0142', name: 'Dr. Meera Deshpande', dept: 'Computer Science', role: 'Professor & HOD', courses: '6 active', status: 'Active', tone: 'success', email: 'meera.d@vanguard.edu.in', joined: '12 Jul 2018' },
  { id: 'FAC-0278', name: 'Prof. Aditya Menon', dept: 'Electronics', role: 'Associate Professor', courses: '4 active', status: 'Active', tone: 'success', email: 'aditya.m@vanguard.edu.in', joined: '04 Aug 2020' },
  { id: 'FAC-0097', name: 'Dr. Nikhil Bhandari', dept: 'Mechanical', role: 'Professor', courses: '3 active', status: 'On Leave', tone: 'warning', email: 'nikhil.b@vanguard.edu.in', joined: '19 Jun 2016' },
  { id: 'FAC-0314', name: 'Dr. Kavya Iyer', dept: 'AI & Data Science', role: 'Assistant Professor', courses: '5 active', status: 'Active', tone: 'success', email: 'kavya.i@vanguard.edu.in', joined: '22 Aug 2022' },
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
  'notices-announcements': {
    title: 'Notices & Announcements', subtitle: 'Draft, review, and publish official campus communication.', action: 'Create Notice', icon: 'megaphone', columns: ['Notice', 'Audience', 'Owner', 'Created', 'Published', 'Status'], rows: [
      ['End-Semester Examination Schedule', 'All Students', 'Examination Cell', '24 Nov 2026', '—', ['Pending Approval', 'warning']],
      ['Winter Break & Campus Closure', 'All Campus', 'Admin Office', '23 Nov 2026', '23 Nov 2026', ['Published', 'success']],
      ['Scholarship Document Submission Window', 'Eligible Students', 'Student Affairs', '21 Nov 2026', '21 Nov 2026', ['Published', 'success']],
      ['Faculty Development Workshop', 'Faculty', 'HR & Training', '18 Nov 2026', '—', ['Draft', 'neutral']],
    ]
  },
  'course-information': {
    title: 'Course Information', subtitle: 'Maintain course catalog, credits, outcomes, and prerequisites.', action: 'Add Course', icon: 'book-plus', columns: ['Course Code', 'Course Name', 'Department', 'Credits', 'Faculty', 'Status'], rows: [
      ['CS301', 'Data Structures & Algorithms', 'Computer Science', '4', 'Dr. Meera Deshpande', ['Active', 'success']],
      ['AI402', 'Machine Learning', 'AI & Data Science', '4', 'Dr. Kavya Iyer', ['Active', 'success']],
      ['EC203', 'Signals & Systems', 'Electronics', '3', 'Prof. Aditya Menon', ['Active', 'success']],
      ['ME305', 'Thermodynamics', 'Mechanical', '3', 'Dr. Nikhil Bhandari', ['Needs Review', 'warning']],
    ]
  },
};

const state = { sidebarCollapsed: false, searchOpen: false, theme: localStorage.getItem('academiaos-theme') || 'light', profileOpen: false, activeModule: 'dashboard', query: '', tableQuery: '', modal: null, students: [...students] };

function icon(name, size = 16) { return `<i data-lucide="${name}" width="${size}" height="${size}"></i>`; }
function esc(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function initials(name) { return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(); }
function activeIdFromPath() { const path = window.location.pathname.replace(/\/$/, '') || '/'; return modules.find(m => m.path === path)?.id || 'dashboard'; }
function linkTo(id) { return modules.find(m => m.id === id)?.path || '/'; }
function badge(label, tone = 'neutral') { return `<span class="badge ${tone}">${esc(label)}</span>`; }
function setIcons() { if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } }); }

function renderShell(content, title, actions = '') {
  const active = state.activeModule;
  document.documentElement.classList.toggle('dark', state.theme === 'dark');
  document.body.innerHTML = `<div class="app">
    <aside class="sidebar ${state.sidebarCollapsed ? 'collapsed' : ''}" id="sidebar">
      <div class="sidebar-top">
        <div class="brand-row"><a href="/" class="brand"><span class="brand-mark">V</span><span class="brand-copy"><span class="brand-name">Vanguard</span><span class="brand-subtitle">Admin Portal</span></span></a><button class="icon-button" id="collapse-sidebar" aria-label="Collapse sidebar">${icon('panel-left-close')}</button></div>
        <button class="search-trigger" id="open-search"><span class="search-label">${icon('search')}<span class="sidebar-label">Global Search</span></span><span class="sidebar-kbd">Ctrl K</span></button>
        <button class="new-action" id="new-action">${icon('plus')}<span class="sidebar-label">New Action</span></button>
        <nav class="nav" aria-label="Primary Navigation">
          ${modules.slice(0, 13).map(m => `<a class="nav-item ${active === m.id ? 'active' : ''}" href="${m.path}">${icon(m.icon)}<span class="sidebar-label">${m.label}</span></a>`).join('')}
          <div class="nav-separator"></div>
          <a class="nav-item ai ${active === 'agentic-workflow' ? 'active' : ''}" href="/agentic-workflow"><span class="nav-leading">${icon('workflow')}<span class="sidebar-label">Agentic Workflow</span></span><span class="ai-chip sidebar-label">AI</span></a>
        </nav>
      </div>
      <div class="sidebar-bottom">
        <div class="profile-popover ${state.profileOpen ? 'open' : ''}" id="profile-popover"><a href="/admin-settings">${icon('user')} My Profile</a><a href="/admin-settings">${icon('settings')} Account Settings</a><a href="/admin-settings">${icon('shield-check')} Manage Permissions</a><button id="lock-session">${icon('log-out')} Logout</button></div>
        <button class="profile-button" id="profile-button"><span class="brand"><span class="profile-avatar">RR</span><span class="profile-copy"><span class="profile-name">Dr. Rajeshwar Rao</span><span class="profile-role">Super Administrator</span></span></span>${icon('settings')}</button>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" id="mobile-menu" aria-label="Open navigation">${icon('menu')}</button><h1 class="page-title">${esc(title)}</h1>${title === 'Admin Dashboard' ? '<span class="context-chip">AY 2026-27 · Odd Sem</span>' : ''}</div><div class="topbar-actions">${actions}<button class="icon-button" id="theme-toggle" aria-label="Toggle theme">${icon(state.theme === 'dark' ? 'sun' : 'moon')}</button></div></header>
      ${content}
    </div>
  </div><div class="modal-backdrop" id="modal-backdrop"></div><div class="toast-stack" id="toast-stack"></div>`;
  bindShell(); setIcons();
}

function bindShell() {
  document.getElementById('collapse-sidebar')?.addEventListener('click', () => { state.sidebarCollapsed = !state.sidebarCollapsed; render(); });
  document.getElementById('mobile-menu')?.addEventListener('click', () => document.getElementById('sidebar')?.classList.toggle('mobile-open'));
  document.getElementById('open-search')?.addEventListener('click', openSearch);
  document.getElementById('new-action')?.addEventListener('click', () => openCreateModal(state.activeModule));
  document.getElementById('theme-toggle')?.addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('academiaos-theme', state.theme); render(); });
  document.getElementById('profile-button')?.addEventListener('click', () => { state.profileOpen = !state.profileOpen; document.getElementById('profile-popover')?.classList.toggle('open', state.profileOpen); });
  document.getElementById('lock-session')?.addEventListener('click', () => showToast('Session locked safely.'));
  document.getElementById('modal-backdrop')?.addEventListener('click', e => { if (e.target.id === 'modal-backdrop') closeModal(); });
}

function render() {
  state.activeModule = activeIdFromPath();
  if (state.activeModule === 'dashboard') renderDashboard();
  else if (state.activeModule === 'agentic-workflow') renderWorkflow();
  else if (state.activeModule === 'admin-settings') renderSettings();
  else if (state.activeModule === 'student-records') renderStudents();
  else if (state.activeModule === 'faculty-management') renderFaculty();
  else renderDataset(state.activeModule);
}

function renderDashboard() {
  const content = `<main class="main">
    <section class="page-intro"><div><p class="eyebrow">VANGUARD INSTITUTE OF TECHNOLOGY · PUNE</p><h2 class="headline">Admin Dashboard</h2><p class="subhead">Real-time institutional command center · Updated 24 Nov 2026</p></div><div class="inline-actions"><a class="secondary" href="/student-records">${icon('user-plus', 14)}Add Student</a><a class="secondary" href="/faculty-management">${icon('users', 14)}Add Faculty</a><a class="secondary" href="/notices-announcements">${icon('megaphone', 14)}Create Notice</a><a class="secondary" href="/agentic-workflow">${icon('sparkles', 14)}Ask AI Agent</a></div></section>
    <section class="kpi-grid">${[
      ['Total Students', '4,820', '+6.4% vs AY 2025-26', 'graduation-cap', 'success'], ['Total Faculty', '284', '1:17 faculty-student ratio', 'users', ''], ['Total Departments', '9', 'Engineering, MCA & Sciences', 'building-2', ''], ['Active Courses', '142', 'NEP-2020 credit aligned', 'layers', ''], ['Pending Assignments', '318', '42 due within 48 hours', 'clipboard-list', 'warning'], ['Active Scholarships', '612', '₹2.48 Cr disbursed YTD', 'award', 'success'], ['Unresolved Grievances', '19', '4 escalated > 7 days', 'shield-alert', 'danger'], ['Upcoming Examinations', '28', 'End-Sem starts 02 Dec', 'file-check-2', '']
    ].map(([label, value, caption, ico, tone]) => `<article class="card low kpi-card"><div class="kpi-top"><span>${label}</span>${icon(ico, 16)}</div><p class="kpi-value">${value}</p><p class="kpi-caption ${tone}">${caption}</p></article>`).join('')}</section>
    <section class="chart-grid"><article class="card chart-card"><div class="card-header"><h3 class="card-title">Student Enrollment</h3><span class="card-note">2022–2026</span></div><svg class="line-chart" viewBox="0 0 320 130" role="img" aria-label="Student enrollment trend"><line x1="20" y1="105" x2="305" y2="105" stroke="currentColor" opacity=".25"/><polyline fill="none" stroke="var(--primary-container)" stroke-width="3" points="35,90 100,76 165,62 230,44 295,24"/><g fill="var(--primary-container)"><circle cx="35" cy="90" r="4"/><circle cx="100" cy="76" r="4"/><circle cx="165" cy="62" r="4"/><circle cx="230" cy="44" r="4"/><circle cx="295" cy="24" r="4"/></g><g fill="currentColor" opacity=".65" font-size="10"><text x="35" y="122" text-anchor="middle">2022</text><text x="100" y="122" text-anchor="middle">2023</text><text x="165" y="122" text-anchor="middle">2024</text><text x="230" y="122" text-anchor="middle">2025</text><text x="295" y="122" text-anchor="middle">2026</text></g></svg><p class="subhead">Steady 6.4% YoY intake growth across B.Tech & MCA.</p></article><article class="card chart-card"><div class="card-header"><h3 class="card-title">By Department</h3><span class="card-note">4,820 total</span></div><div class="bar-stack">${[['Computer Science','1,420',82],['Electronics & Comm.','980',62],['Mechanical Engg.','840',52],['AI & Data Science','760',46]].map(([n, v, p]) => `<div class="bar-row"><span>${n}</span><span class="mono">${v}</span><div class="progress-track"><div class="progress-value" style="width:${p}%"></div></div></div>`).join('')}</div></article><article class="card chart-card"><div class="card-header"><h3 class="card-title">Attendance</h3>${badge('186 below 75%', 'warning')}</div><div class="donut-wrap"><div class="donut"><span>86.4%</span></div><ul class="metric-list"><li><strong class="success">86.4%</strong> campus average</li><li><strong class="warning">186</strong> students below threshold</li><li><a class="info" href="/agentic-workflow">Run AI attendance audit →</a></li></ul></div></article><article class="card chart-card"><div class="card-header"><h3 class="card-title">CGPA Overview</h3><span class="card-note">Avg CGPA 7.92</span></div><svg class="line-chart" viewBox="0 0 300 110"><g fill="var(--primary-container)"><rect x="20" y="55" width="36" height="40" rx="4" opacity=".45"/><rect x="74" y="35" width="36" height="60" rx="4" opacity=".65"/><rect x="128" y="15" width="36" height="80" rx="4"/><rect x="182" y="22" width="36" height="73" rx="4" fill="var(--primary)"/><rect x="236" y="45" width="36" height="50" rx="4" fill="var(--success)"/></g><g fill="currentColor" opacity=".65" font-size="10"><text x="38" y="108" text-anchor="middle">&lt;6</text><text x="92" y="108" text-anchor="middle">6–7</text><text x="146" y="108" text-anchor="middle">7–8</text><text x="200" y="108" text-anchor="middle">8–9</text><text x="254" y="108" text-anchor="middle">9+</text></g></svg></article><article class="card chart-card"><div class="card-header"><h3 class="card-title">Scholarship Tracker</h3><span class="card-note">₹2.48 Cr YTD</span></div><div class="bar-stack">${[['Approved', '612', 72, 'var(--success)'], ['Under Review', '86', 32, 'var(--primary)'], ['Pending Docs', '42', 18, 'var(--warning)']].map(([n, v, p, c]) => `<div class="bar-row"><span>${n}</span><span class="mono">${v}</span><div class="progress-track"><div class="progress-value" style="width:${p}%;background:${c}"></div></div></div>`).join('')}</div></article><article class="card chart-card"><div class="card-header"><h3 class="card-title">System Health</h3>${badge('All systems operational', 'success')}</div><ul class="metric-list"><li><strong>99.98%</strong> portal uptime this month</li><li><strong>18 ms</strong> average API response</li><li><strong>24 Nov 2026</strong> last backup verified</li></ul><button class="secondary" style="margin-top:18px" data-toast="System health report exported.">${icon('download', 14)}Export Report</button></article></section>
    <section class="activity-grid"><article class="card"><div class="card-header"><h3 class="card-title">Recent Activity</h3><a class="info" href="/admin-settings">View audit log →</a></div><div class="activity-list">${[['user-plus','12 student records imported','Student Data · CSV upload completed','09:42 AM'],['file-check-2','End-Sem exam schedule updated','Examination Cell · 28 sessions configured','Yesterday'],['badge-check','Scholarship batch approved','Student Affairs · 38 records moved to disbursement','23 Nov'],['megaphone','Notice published to all students','Admin Office · Winter break announcement','22 Nov']].map(([ico,t,m,time]) => `<div class="activity-row"><span class="activity-icon">${icon(ico,15)}</span><div><p class="activity-title">${t}</p><p class="activity-meta">${m}</p></div><span class="activity-time">${time}</span></div>`).join('')}</div></article><article class="card"><div class="card-header"><h3 class="card-title">Pending Approvals</h3><span class="card-note">4 awaiting action</span></div><div class="approval-list">${[['End-Sem Examination Schedule','Examination Cell · 24 Nov 2026','Review'],['MahaDBT applications · Batch 08','Student Affairs · 18 records','Approve'],['Faculty Development Workshop notice','HR & Training · Draft','Review']].map(([t,m,a]) => `<div class="approval"><div class="approval-head"><p class="approval-title">${t}</p>${badge('Action required','warning')}</div><p class="approval-meta">${m}</p><div class="approval-actions"><button class="primary" data-toast="${a} action queued for approval.">${a}</button><button class="secondary" data-toast="Approval item opened.">${icon('external-link', 13)}Open</button></div></div>`).join('')}</div></article></section>
  </main>`;
  renderShell(content, 'Admin Dashboard', `<button class="secondary" id="customize-dashboard">${icon('sliders-horizontal', 14)}<span class="secondary-label">Customize Widgets</span></button><a class="primary" href="/agentic-workflow">${icon('sparkles', 14)}<span>Ask AI Agent</span></a>`);
  document.querySelectorAll('[data-toast]').forEach(el => el.addEventListener('click', () => showToast(el.dataset.toast)));
  document.getElementById('customize-dashboard')?.addEventListener('click', () => openInfoModal('Customize dashboard', 'Choose which widget groups are visible for your admin workspace.'));
}

function renderTablePage(config, rows, extra = '') {
  const filtered = rows.filter(row => row.join(' ').toLowerCase().includes(state.tableQuery.toLowerCase()));
  const content = `<main class="main"><section class="page-intro"><div><p class="eyebrow">ACADEMIAOS OPERATIONS</p><h2 class="headline">${config.title}</h2><p class="subhead">${config.subtitle}</p></div><div class="inline-actions"><button class="secondary" data-toast="CSV export prepared for download.">${icon('download', 14)}Export CSV</button><button class="primary" id="page-action">${icon(config.icon, 14)}${config.action}</button></div></section><section class="toolbar"><div class="search-box">${icon('search', 16)}<input class="field" id="table-search" value="${esc(state.tableQuery)}" placeholder="Search ${config.title.toLowerCase()}..." /></div><select class="select" id="status-filter"><option value="">All statuses</option><option>Active</option><option>Published</option><option>Pending</option><option>Approved</option><option>Open</option></select><button class="secondary" data-toast="Advanced filters opened.">${icon('sliders-horizontal', 14)}Filters</button></section><section class="card table-card"><div class="table-scroll"><table><thead><tr>${config.columns.map(c => `<th>${c}</th>`).join('')}<th class="actions-cell">Actions</th></tr></thead><tbody>${filtered.length ? filtered.map((row, index) => `<tr>${row.map((cell, i) => `<td>${Array.isArray(cell) ? badge(cell[0], cell[1]) : i === 0 ? `<span class="mono">${esc(cell)}</span>` : esc(cell)}</td>`).join('')}<td class="actions-cell"><span class="row-actions"><button class="icon-small" data-toast="Record opened in detail view." aria-label="Open record">${icon('external-link',14)}</button><button class="icon-small" data-toast="Record action menu opened." aria-label="More actions">${icon('more-horizontal',14)}</button></span></td></tr>`).join('') : `<tr><td colspan="${config.columns.length + 1}"><div class="empty">No records match your search.</div></td></tr>`}</tbody></table></div><div class="table-footer"><span>Showing ${filtered.length} of ${rows.length} records</span><div class="pagination"><button class="icon-small" data-toast="Already on the first page.">${icon('chevron-left',14)}</button><button class="icon-small" style="color:var(--primary);background:var(--primary-tint)">1</button><button class="icon-small" data-toast="Page 2 selected.">2</button><button class="icon-small" data-toast="Next page selected.">${icon('chevron-right',14)}</button></div></div></section>${extra}</main>`;
  renderShell(content, config.title, `<button class="secondary" data-toast="Last synced just now.">${icon('refresh-cw', 14)}<span class="secondary-label">Sync</span></button>`);
  document.getElementById('table-search')?.addEventListener('input', e => { state.tableQuery = e.target.value; renderTablePage(config, rows, extra); });
  document.getElementById('page-action')?.addEventListener('click', () => openCreateModal(state.activeModule));
  document.querySelectorAll('[data-toast]').forEach(el => el.addEventListener('click', () => showToast(el.dataset.toast)));
}

function renderStudents() {
  const q = state.tableQuery.toLowerCase(); const filtered = state.students.filter(s => `${s.name} ${s.roll} ${s.email} ${s.dept}`.toLowerCase().includes(q));
  const content = `<main class="main"><section class="page-intro"><div><p class="eyebrow">STUDENT DATA · 4,820 ENROLLED</p><h2 class="headline">Student Records Management</h2><p class="subhead">Search, review, and maintain student profiles across all departments.</p></div><div class="inline-actions"><button class="secondary" data-toast="Imported 12 student records from CSV template.">${icon('upload', 14)}Import CSV</button><button class="primary" id="add-student">${icon('user-plus', 14)}Add Student</button></div></section><section class="toolbar"><div class="search-box">${icon('search', 16)}<input class="field" id="table-search" value="${esc(state.tableQuery)}" placeholder="Search by name, roll number, or email..." /></div><select class="select"><option>All Departments</option><option>Computer Science</option><option>Electronics</option><option>Mechanical</option><option>AI & Data Science</option></select><select class="select"><option>All Semesters</option><option>Sem 3</option><option>Sem 5</option><option>Sem 7</option></select></section><section class="card table-card"><div class="table-scroll"><table><thead><tr><th>Roll No</th><th>Student</th><th>Department & Course</th><th>Semester</th><th>Attendance</th><th>Fee Status</th><th class="actions-cell">Actions</th></tr></thead><tbody>${filtered.map((s, index) => `<tr class="student-row" data-index="${index}"><td><span class="mono">${s.roll}</span></td><td><div class="person"><span class="person-avatar">${initials(s.name)}</span><span><p class="person-name">${s.name}</p><p class="person-meta">${s.email}</p></span></div></td><td><span>${s.dept}</span><br><span class="muted">${s.course}</span></td><td>${s.sem}</td><td><span class="mono ${parseFloat(s.attendance) < 75 ? 'danger' : 'success'}">${s.attendance}</span></td><td>${badge(s.fee, s.feeTone)}</td><td class="actions-cell"><span class="row-actions"><button class="icon-small student-open" data-index="${index}" aria-label="Open student">${icon('external-link',14)}</button><button class="icon-small" data-toast="Student action menu opened.">${icon('more-horizontal',14)}</button></span></td></tr>`).join('')}</tbody></table></div><div class="table-footer"><span>Showing ${filtered.length} of 4,820 students</span><div class="pagination"><button class="icon-small" data-toast="Already on the first page.">${icon('chevron-left',14)}</button><button class="icon-small" style="color:var(--primary);background:var(--primary-tint)">1</button><button class="icon-small" data-toast="Page 2 selected.">2</button><button class="icon-small" data-toast="Next page selected.">${icon('chevron-right',14)}</button></div></div></section></main>`;
  renderShell(content, 'Student Records Management');
  document.getElementById('table-search')?.addEventListener('input', e => { state.tableQuery = e.target.value; renderStudents(); });
  document.getElementById('add-student')?.addEventListener('click', () => openCreateModal('student-records'));
  document.querySelectorAll('.student-row').forEach(row => row.addEventListener('click', e => { if (!e.target.closest('button')) openStudent(filtered[Number(row.dataset.index)]); }));
  document.querySelectorAll('.student-open').forEach(button => button.addEventListener('click', e => { e.stopPropagation(); openStudent(filtered[Number(button.dataset.index)]); }));
  document.querySelectorAll('[data-toast]').forEach(el => el.addEventListener('click', () => showToast(el.dataset.toast)));
}

function renderFaculty() {
  const rows = faculty.map(f => [f.id, `${f.name} · ${f.email}`, `${f.dept} · ${f.role}`, f.courses, f.joined, [f.status, f.tone]]);
  renderTablePage({ title: 'Faculty Management', subtitle: 'Maintain faculty records, teaching loads, and department assignments.', action: 'Add Faculty', icon: 'user-plus', columns: ['Faculty ID', 'Faculty Member', 'Department & Role', 'Teaching Load', 'Joined', 'Status'] }, rows, '<section class="detail-grid"><div class="info-block"><p class="info-label">Total faculty</p><p class="info-value">284</p></div><div class="info-block"><p class="info-label">Active this semester</p><p class="info-value">276</p></div><div class="info-block"><p class="info-label">Open faculty actions</p><p class="info-value">8 pending</p></div></section>');
}

function renderDataset(id) { const config = datasets[id]; renderTablePage(config, config.rows, id === 'notices-announcements' ? '<section class="card low"><div class="card-header"><h3 class="card-title">Publishing queue</h3><span class="card-note">Approval is required before public release</span></div><div class="timeline"><div class="timeline-item"><span class="timeline-dot"></span><div><p class="timeline-title">Draft → Department Review</p><p class="timeline-note">The department owner checks wording and audience.</p></div></div><div class="timeline-item"><span class="timeline-dot"></span><div><p class="timeline-title">Department Review → Admin Approval</p><p class="timeline-note">Super administrators approve high-reach notices.</p></div></div></div></section>' : ''); }

function renderWorkflow() {
  const content = `<div class="workflow-layout"><section class="workflow-main"><div class="agent-strip"><span class="agent-label">Active Agents:</span>${['Student Data','Academic','Scholarship','Grievance','Examination','Notice'].map(a => `<span class="agent-chip">${a}</span>`).join('')}</div><div class="workflow-center"><div class="workflow-welcome"><span class="workflow-icon">${icon('workflow', 24)}</span><h2>What administrative workflow should we run?</h2><p>Instructions are decomposed across specialized agents. Consequential actions always pause for your approval.</p></div><div id="workflow-feed"><div class="prompt-grid">${[['Attendance < 75% Audit','Student Data + Notice Agents','Find all students with attendance below 75% and prepare notification drafts.'],['Scholarship Eligibility Match','Scholarship + Student Data Agents','Identify students who may qualify for available NSP and state scholarships.'],['Grievance Escalation Report','Grievance Agent · SLA > 7 days','Find grievances unresolved for more than seven days and prepare an escalation report.'],['Clash-Free CSE Timetable','Academic + Examination Agents','Generate a clash-free timetable for the Computer Science department.']].map(([t, s, p]) => `<button class="prompt-card workflow-prompt" data-prompt="${p}"><strong>${t}</strong><span>${s}</span></button>`).join('')}</div></div></div><form class="workflow-input" id="workflow-form"><textarea id="ai-prompt" placeholder="Instruct Vanguard AI (e.g., 'Draft an official notice for the upcoming semester examinations' or 'Show students who have not submitted assignments')..."></textarea><div class="workflow-input-bottom"><span class="safety-note">${icon('shield-check', 14)}AI never deletes records or publishes notices without approval</span><button class="primary" type="submit">Run Workflow ${icon('arrow-up', 14)}</button></div></form></section><aside class="workflow-history"><div class="card-header"><h3 class="card-title">Workflow History & Audit</h3><span class="card-note">Live Log</span></div><div class="history-list"><div class="history-item"><div class="history-head"><p class="history-title">Department Performance Summary</p>${badge('Completed','success')}</div><p class="history-meta">Student Data Agent · Approved by Dr. Rao</p><p class="card-note" style="margin-top:6px">24 Nov 2026 · 09:42 AM</p></div><div class="history-item"><div class="history-head"><p class="history-title">Exam Hall Availability Check</p>${badge('Completed','success')}</div><p class="history-meta">Examination Agent · 14 halls verified</p><p class="card-note" style="margin-top:6px">23 Nov 2026 · 04:15 PM</p></div><div class="history-item"><div class="history-head"><p class="history-title">MahaDBT Batch 08 Verification</p>${badge('Awaiting Approval','warning')}</div><p class="history-meta">Scholarship Agent · 18 applications matched</p><p class="card-note" style="margin-top:6px">22 Nov 2026 · 02:08 PM</p></div></div></aside></div>`;
  renderShell(content, 'Agentic Workflow Orchestrator', `<span class="context-chip">Functional Demo Mode · RBAC Guarded</span>`);
  document.querySelectorAll('.workflow-prompt').forEach(button => button.addEventListener('click', () => runWorkflow(button.dataset.prompt)));
  document.getElementById('workflow-form')?.addEventListener('submit', e => { e.preventDefault(); const prompt = document.getElementById('ai-prompt').value.trim(); if (prompt) runWorkflow(prompt); else showToast('Describe the workflow you want Vanguard AI to run.'); });
}

function runWorkflow(prompt) { const feed = document.getElementById('workflow-feed'); if (!feed) return; feed.innerHTML = `<div class="execution"><div class="execution-card"><div class="execution-row"><p class="execution-title">${esc(prompt)}</p>${badge('Running','info')}</div><p class="execution-copy">Vanguard AI is decomposing this instruction across Student Data, Academic, and Notice agents.</p></div><div class="card"><div class="execution-row"><span>${icon('loader-circle',15)} <strong>Checking records and policy rules…</strong></span><span class="card-note">Step 1 of 3</span></div><div class="progress-track" style="margin-top:12px"><div class="progress-value" style="width:56%; animation: pulse 1.2s infinite alternate"></div></div></div></div>`; setIcons(); setTimeout(() => { feed.innerHTML += `<div class="execution-card" style="background:var(--surface);border-color:var(--line)"><div class="execution-row"><p class="execution-title">Approval required before external action</p>${badge('Paused','warning')}</div><p class="execution-copy">The workflow prepared a draft result. Review and approve it before any notice, status change, or bulk action is committed.</p><div class="approval-actions" style="margin-top:12px"><button class="primary" data-toast="Workflow approved. Draft actions queued.">Approve Action</button><button class="secondary" data-toast="Workflow paused for later review.">Keep for Review</button></div></div>`; setIcons(); document.querySelectorAll('[data-toast]').forEach(el => el.addEventListener('click', () => showToast(el.dataset.toast))); }, 850); }

function renderSettings() {
  const content = `<main class="main"><section class="page-intro"><div><p class="eyebrow">ADMINISTRATION · RBAC & SECURITY</p><h2 class="headline">Admin Settings & Security</h2><p class="subhead">Manage your profile, access controls, portal preferences, and active sessions.</p></div><button class="primary" data-toast="Settings saved successfully.">${icon('save',14)}Save Changes</button></section><section class="detail-grid"><article class="card"><div class="card-header"><h3 class="card-title">Profile</h3>${icon('user-cog',16)}</div><div class="form-grid"><label class="form-field"><span class="form-label">Full name</span><input class="field" value="Dr. Rajeshwar Rao" /></label><label class="form-field"><span class="form-label">Role</span><input class="field" value="Super Administrator" disabled /></label><label class="form-field full"><span class="form-label">Work email</span><input class="field" value="rajeshwar.rao@vanguard.edu.in" /></label><label class="form-field full"><span class="form-label">Phone</span><input class="field" value="+91 98230 11001" /></label></div></article><article class="card"><div class="card-header"><h3 class="card-title">Security</h3>${icon('shield-check',16)}</div><div class="approval-list"><div class="approval"><div class="approval-head"><p class="approval-title">Two-factor authentication</p>${badge('Enabled','success')}</div><p class="approval-meta">Authenticator app · Last verified 12 Nov 2026</p><button class="secondary" data-toast="2FA recovery codes rotated.">Rotate recovery codes</button></div><div class="approval"><div class="approval-head"><p class="approval-title">Password</p><span class="card-note">Updated 38 days ago</span></div><button class="secondary" data-toast="Password reset flow opened.">Change password</button></div></div></article><article class="card"><div class="card-header"><h3 class="card-title">Portal preferences</h3>${icon('sliders-horizontal',16)}</div><div class="approval-list"><div class="approval"><div class="approval-head"><p class="approval-title">Default academic year</p><select class="select"><option>AY 2026-27 · Odd Sem</option><option>AY 2025-26 · Even Sem</option></select></div></div><div class="approval"><div class="approval-head"><p class="approval-title">AI workflow approvals</p><label><input type="checkbox" checked /> Require approval</label></div><p class="approval-meta">Consequential actions always pause before committing.</p></div></div></article></section><section class="card"><div class="card-header"><h3 class="card-title">Recent sessions</h3><span class="card-note">3 active sessions</span></div><div class="table-scroll"><table><thead><tr><th>Device</th><th>Location</th><th>Last active</th><th>Status</th><th class="actions-cell">Actions</th></tr></thead><tbody><tr><td>Chrome on Windows</td><td>Pune, Maharashtra</td><td>Now</td><td>${badge('Current Session','success')}</td><td class="actions-cell"><button class="secondary" data-toast="Current session cannot be revoked.">Current</button></td></tr><tr><td>Safari on iPad</td><td>Pune, Maharashtra</td><td>2 hours ago</td><td>${badge('Active','info')}</td><td class="actions-cell"><button class="secondary" data-toast="Session revoked securely.">Revoke</button></td></tr><tr><td>Chrome on macOS</td><td>Mumbai, Maharashtra</td><td>Yesterday</td><td>${badge('Expired','neutral')}</td><td class="actions-cell"><button class="secondary" data-toast="Session details opened.">Details</button></td></tr></tbody></table></div></section></main>`;
  renderShell(content, 'Admin Settings & Security'); document.querySelectorAll('[data-toast]').forEach(el => el.addEventListener('click', () => showToast(el.dataset.toast)));
}

function openStudent(s) { openModal(`<div class="modal-header"><div class="person"><span class="person-avatar" style="width:44px;height:44px">${initials(s.name)}</span><span><h3 class="modal-title">${s.name}</h3><p class="card-note">${s.roll} · ${s.course}</p></span></div><button class="icon-button" data-close-modal>${icon('x')}</button></div><div class="modal-body"><div class="detail-grid"><div class="info-block"><p class="info-label">Email</p><p class="info-value">${s.email}</p></div><div class="info-block"><p class="info-label">Phone</p><p class="info-value">${s.phone}</p></div><div class="info-block"><p class="info-label">Overall attendance</p><p class="info-value ${parseFloat(s.attendance) < 75 ? 'danger' : 'success'}">${s.attendance}</p></div><div class="info-block"><p class="info-label">Guardian</p><p class="info-value">${s.guardian}</p></div><div class="info-block"><p class="info-label">Fee status</p><p class="info-value">${badge(s.fee, s.feeTone)}</p></div><div class="info-block"><p class="info-label">Address</p><p class="info-value">${s.address}</p></div></div><div class="approval"><p class="approval-title">Profile tabs</p><p class="approval-meta">Overview & Guardian · Attendance & Academics · Fees, Scholarship & Docs</p></div></div>`); }

function openCreateModal(moduleId) { const config = moduleId === 'student-records' ? { title: 'Enroll New Student', fields: [['Full name','Tanvi Deshpande'],['Roll number','CS26B099'],['Department','Computer Science'],['Email','tanvi.d@vanguard.edu.in']] } : { title: modules.find(m => m.id === moduleId)?.label || 'Create new record', fields: [['Title','New record'],['Owner','Admin Office'],['Effective date','26 Nov 2026'],['Notes','Add operational notes']] }; openModal(`<div class="modal-header"><h3 class="modal-title">${config.title}</h3><button class="icon-button" data-close-modal>${icon('x')}</button></div><div class="modal-body"><div class="form-grid">${config.fields.map(([label, value]) => `<label class="form-field"><span class="form-label">${label}</span><input class="field" value="${value}" /></label>`).join('')}</div><div class="modal-footer"><button class="secondary" data-close-modal>Cancel</button><button class="primary" data-save-modal>Save ${moduleId === 'student-records' ? 'Student' : 'Record'}</button></div></div>`); }
function openInfoModal(title, text) { openModal(`<div class="modal-header"><h3 class="modal-title">${title}</h3><button class="icon-button" data-close-modal>${icon('x')}</button></div><div class="modal-body"><p class="subhead">${text}</p><div class="approval"><p class="approval-title">Dashboard widgets</p><p class="approval-meta">KPIs · Analytics · Activity · Approvals · System Health</p></div><div class="modal-footer"><button class="primary" data-close-modal>Done</button></div></div>`); }
function openModal(inner) { const backdrop = document.getElementById('modal-backdrop'); if (!backdrop) return; backdrop.innerHTML = `<div class="modal">${inner}</div>`; backdrop.classList.add('open'); backdrop.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal)); backdrop.querySelector('[data-save-modal]')?.addEventListener('click', () => { closeModal(); showToast('Record saved successfully.'); }); setIcons(); }
function closeModal() { document.getElementById('modal-backdrop')?.classList.remove('open'); }
function openSearch() { openModal(`<div class="modal-header"><input class="field" id="global-search-input" placeholder="Jump to any module or record..." autofocus /><button class="secondary" data-close-modal>ESC</button></div><div class="search-results">${modules.map(m => `<a href="${m.path}" class="search-result">${icon(m.icon)}<span><strong>${m.label}</strong><small class="muted" style="display:block">Open module</small></span></a>`).join('')}</div>`); }
function showToast(message) { const stack = document.getElementById('toast-stack'); if (!stack) return; const toast = document.createElement('div'); toast.className = 'toast'; toast.innerHTML = `${icon('check-circle', 16)}<span>${esc(message)}</span>`; stack.appendChild(toast); setIcons(); setTimeout(() => toast.remove(), 3200); }

window.addEventListener('popstate', render);
document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); } if (e.key === 'Escape') closeModal(); });

document.addEventListener('click', e => { const link = e.target.closest('a'); if (!link || !link.href.startsWith(window.location.origin) || link.target === '_blank') return; const url = new URL(link.href); if (url.origin !== window.location.origin) return; e.preventDefault(); history.pushState({}, '', url.pathname); render(); });

state.activeModule = activeIdFromPath();
render();
