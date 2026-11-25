import './styles.css'
import { startPortalAuth } from './portal-auth.js'

const icon = (name) => `<span class="icon icon-${name}" aria-hidden="true"></span>`
let portalAuth = null
const safeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const displayName = () => portalAuth?.profile?.full_name || 'Faculty account'
const initialsFor = (name) => name.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'F'

const nav = [
  ['dashboard', 'Dashboard', '⌂'],
  ['attendance', 'Attendance Management', '✓'],
  ['assignments', 'Assignment Management', '▤'],
  ['timetable', 'Timetable', '◷'],
  ['courses', 'Course Information', '▣'],
  ['courses', 'Student Performance', '▥'],
  ['timetable', 'Hybrid Teaching', '▹'],
  ['courses', 'Study Materials', '▤'],
  ['courses', 'Notices & Announcements', '♢'],
]
const routeNames = { dashboard: 'Dashboard', attendance: 'Attendance Management', assignments: 'Assignment Management', timetable: 'Timetable & Hybrid', courses: 'Courses, Performance & Notices', workflow: 'AI Workflow', profile: 'Faculty Profile & CV' }
const routeFromPath = () => (location.pathname.slice(1).split('/')[0] || 'dashboard')
let activeRoute = routeNames[routeFromPath()] ? routeFromPath() : 'dashboard'
let collapsed = false

const metrics = [
  { label: 'Average attendance', value: '84.6%', delta: '+2.4%', tone: 'success', icon: '◔' },
  { label: 'Pending assignments', value: '08', delta: '03 due this week', tone: 'warning', icon: '▤' },
  { label: 'Classes this week', value: '18', delta: '04 hybrid sessions', tone: 'blue', icon: '◷' },
  { label: 'Active students', value: '142', delta: '+6 this semester', tone: 'indigo', icon: '♙' },
]

function shell(content) {
  return `<div class="app-shell ${collapsed ? 'is-collapsed' : ''}">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">C</span><span class="sidebar-label brand-name">CampusPulse</span><button class="icon-button collapse-button" data-action="collapse" aria-label="Toggle navigation">${collapsed ? '→' : '←'}</button></div>
      <button class="new-action" data-action="new" aria-describedby="demo-note"><span class="new-plus">+</span><span class="sidebar-label">New Action</span></button>
      <nav class="nav-list">
        ${nav.map(([route,label,glyph]) => { const available = ['Dashboard','Attendance Management','Assignment Management','Timetable','Course Information'].includes(label); return available ? `<a class="nav-item ${activeRoute === route ? 'active' : ''}" href="/${route}" title="${label}"><span class="nav-icon">${glyph}</span><span class="sidebar-label">${label}</span></a>` : `<span class="nav-item" aria-disabled="true" title="${label} is not available in this local demo"><span class="nav-icon">${glyph}</span><span class="sidebar-label">${label} · coming soon</span></span>` }).join('')}
      </nav>
      <div class="nav-divider"></div>
      <a class="nav-item ai-link ${activeRoute === 'workflow' ? 'active' : ''}" href="/workflow"><span class="nav-icon">✦</span><span class="sidebar-label">AI Workflow</span><span class="ai-badge sidebar-label">AI</span></a>
      <div class="sidebar-spacer"></div>
      <div class="sidebar-user"><div class="avatar small">${safeHtml(initialsFor(displayName()))}</div><div class="sidebar-label user-copy"><strong>${safeHtml(displayName())}</strong><span>${safeHtml(portalAuth?.user?.email || 'Faculty')}</span></div><button class="signout-button" data-action="logout" type="button">Sign out</button></div>
    </aside>
    <main class="main-area">
      <header class="topbar"><div class="breadcrumbs"><span class="muted">CampusPulse</span><span>/</span><strong>${routeNames[activeRoute]}</strong></div><div class="top-actions"><button class="icon-button" data-action="notify" aria-label="Notifications">♧<span class="notification-dot"></span></button><button class="profile-chip" data-action="profile"><span class="avatar tiny">${safeHtml(initialsFor(displayName()))}</span><span class="profile-chip-name">${safeHtml(displayName())}</span><span>⌄</span></button></div></header>
      <div class="content-wrap"><p id="demo-note" class="muted" role="note">Local demo only — changes stay in this page and are not saved or sent.</p>${content}</div>
    </main>
    <div id="toast" class="toast" role="status"></div>
  </div>`
}

const pageHeader = (eyebrow, title, subtitle, actions='') => `<div class="page-header"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div><div class="header-actions">${actions}</div></div>`
const card = (title, body, extra='') => `<section class="card ${extra}"><div class="card-head"><h2>${title}</h2></div>${body}</section>`
const btn = (label, cls='secondary', action='') => `<button class="btn ${cls}" ${action ? `data-action="${action}"` : ''}>${label}</button>`
const pill = (text, tone='neutral') => `<span class="pill ${tone}">${text}</span>`

function dashboard() {
  return pageHeader('Faculty workspace', 'Faculty Dashboard', 'Good morning, Dr. Deshmukh. Here is your academic workspace for today.', btn('View profile', 'secondary', 'profile')) + `
    <div class="metric-grid">${metrics.map(m => `<div class="metric-card"><div class="metric-top"><span class="metric-icon ${m.tone}">${m.icon}</span><span class="metric-delta ${m.tone}">${m.delta}</span></div><div class="metric-label">${m.label}</div><div class="metric-value">${m.value}</div></div>`).join('')}</div>
    <div class="dashboard-grid"><div class="span-8">${card("Today's schedule", `<div class="schedule-list">${[['09:30 AM','CS301','AVL Tree Rotations & Balancing','Room 304','in-progress'],['11:00 AM','CS405','Database Management Systems','Room 211','upcoming'],['02:00 PM','CS301','Tutorial: Graph Algorithms','Online · Google Meet','hybrid']].map(x => `<div class="schedule-row"><div class="schedule-time mono">${x[0]}</div><div class="schedule-dot ${x[4]}"></div><div class="schedule-info"><strong>${x[1]} <span class="muted">· ${x[2]}</span></strong><span>${x[3]}</span></div><div>${pill(x[4] === 'in-progress' ? 'Live now' : x[4] === 'hybrid' ? 'Hybrid' : 'Upcoming', x[4] === 'in-progress' ? 'success' : x[4] === 'hybrid' ? 'blue' : 'neutral')}</div></div>`).join('')}</div>`)}
      ${card('Attendance overview', `<div class="attendance-overview"><div class="donut"><div><strong>84.6%</strong><span>overall</span></div></div><div class="attendance-bars">${[['CS301','91%','success'],['CS405','84%','blue'],['CS212','79%','warning']].map(x => `<div class="bar-item"><div><span>${x[0]}</span><strong>${x[1]}</strong></div><div class="bar"><i class="${x[2]}" style="width:${x[1]}"></i></div></div>`).join('')}</div></div>`)}</div><div class="span-4">${card('Announcements', `<div class="announcement-list"><div class="announcement"><span class="announcement-dot red"></span><div><strong>Internal assessment schedule</strong><p>Submit marks by 29 Nov 2026</p><span class="muted">Today, 10:32 AM</span></div></div><div class="announcement"><span class="announcement-dot blue"></span><div><strong>Faculty development workshop</strong><p>Registration closes this Friday</p><span class="muted">Yesterday</span></div></div><div class="announcement"><span class="announcement-dot green"></span><div><strong>Library hours extended</strong><p>During end-semester preparation</p><span class="muted">24 Nov 2026</span></div></div></div><a class="text-link" href="/courses">View all notices →</a>`)}</div></div>
    <div class="section-heading"><h2>Academic overview & quick tools</h2><span class="muted">Common faculty actions</span></div><div class="quick-grid">${[['✓','Take attendance','Mark today’s attendance','/attendance'],['▤','Generate assignment','Create an AI-assisted brief','/assignments'],['◷','Plan hybrid lesson','Prepare your next class','/timetable'],['✦','Ask AI workflow','Get help with academic tasks','/workflow']].map(x => `<a class="quick-card" href="${x[3]}"><span class="quick-icon">${x[0]}</span><div><strong>${x[1]}</strong><span>${x[2]}</span></div><span class="arrow">→</span></a>`).join('')}</div>`
}

function courses() {
  return pageHeader('Academic records', 'Courses, Performance, Materials & Notices', 'A consolidated view of your teaching portfolio and student outcomes.', `<div class="segmented"><button class="selected">Overview</button><button>Courses</button><button>Notices</button></div>`) + `<div class="course-grid">${[['CS301','Data Structures & Algorithms','Semester V · 42 students','91%','success','6 materials'],['CS405','Database Management Systems','Semester V · 38 students','84%','blue','4 materials'],['CS212','Operating Systems','Semester III · 31 students','79%','warning','8 materials'],['CS506','Machine Learning','Semester VII · 31 students','86%','success','5 materials']].map(x => `<div class="course-card"><div class="course-code mono">${x[0]}</div><h2>${x[1]}</h2><p>${x[2]}</p><div class="course-foot"><span class="course-attendance ${x[4]}">${x[3]} attendance</span><span class="muted">${x[5]}</span></div></div>`).join('')}</div><div class="two-col">${card('Student performance <span class="card-sub">CS301 · Sem V-A</span>', `<div class="table-tools"><span class="muted">Continuous assessment</span><select><option>All students</option><option>Top performers</option><option>Needs attention</option></select></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Attendance</th><th>Assignments</th><th>Average</th><th>Status</th></tr></thead><tbody>${[['Aarav Mehta','96%','8 / 8','91%','Excellent'],['Ishita Rao','92%','7 / 8','88%','Excellent'],['Kabir Shah','78%','6 / 8','71%','On track'],['Meera Nair','68%','5 / 8','64%','Attention']].map(x => `<tr><td><strong>${x[0]}</strong><span class="muted mono">CS301-${x[0].slice(0,2).toUpperCase()}</span></td><td>${x[1]}</td><td>${x[2]}</td><td><strong>${x[3]}</strong></td><td>${pill(x[4], x[4] === 'Attention' ? 'warning' : x[4] === 'Excellent' ? 'success' : 'blue')}</td></tr>`).join('')}</tbody></table></div>`) + card('Notices & announcements', `<div class="notice-stack">${[['Assessment schedule released','Internal assessments begin from 2 Dec 2026.','Academic office','Today'],['Faculty development workshop','AI-assisted pedagogy · 28 Nov · Seminar Hall 2','Dean’s office','Yesterday'],['Upload course files','Please upload final reading lists for next semester.','Department office','24 Nov']].map(x => `<div class="notice"><span class="notice-icon">♢</span><div><strong>${x[0]}</strong><p>${x[1]}</p><small>${x[2]} <span>· ${x[3]}</span></small></div></div>`).join('')}</div>`)}</div>`
}

function timetable() {
  const days = ['Mon 24','Tue 25','Wed 26','Thu 27','Fri 28'];
  return pageHeader('Teaching operations', 'Timetable, Hybrid Teaching & Lesson AI', 'Plan classes, launch hybrid sessions, and prepare AI-assisted lesson notes.', btn('Create lesson plan', 'primary', 'lesson')) + `<div class="hero-course"><div><span class="eyebrow">Next class · Today, 09:30 AM</span><h2>CS301 · AVL Tree Rotations & Balancing</h2><p><span class="mono">Room 304</span> · 42 students · 55 minutes</p></div><div class="hero-actions">${pill('Live now','success')}${btn('Open class', 'secondary', 'open-class')}</div></div><div class="two-col timetable-cols">${card('Weekly timetable', `<div class="week-nav"><button class="icon-button" disabled aria-label="Previous week unavailable" title="Week navigation is not available in this local demo">‹</button><strong>24 – 28 November 2026</strong><button class="icon-button" disabled aria-label="Next week unavailable" title="Week navigation is not available in this local demo">›</button></div><div class="week-grid">${days.map((d,i) => `<div class="day-col"><div class="day-label ${i === 0 ? 'today' : ''}">${d}</div>${[['09:30','CS301','AVL Tree','purple'],['11:00','CS405','Database','blue'],['14:00','CS301','Tutorial','green']].slice(0, i === 2 ? 2 : 3).map(x => `<div class="lesson ${x[3]}"><span class="mono">${x[0]}</span><strong>${x[1]}</strong><span>${x[2]}</span></div>`).join('')}</div>`).join('')}</div>`) + card('AI lesson planner', `<div class="ai-panel"><div class="ai-orb">✦</div><div><h3>Prepare your next lesson</h3><p>Generate objectives, a teaching flow, examples, and quick checks for your class.</p></div></div><label class="field-label">Lesson topic</label><input class="input" value="AVL Tree Rotations & Balancing" /><label class="field-label">Teaching mode</label><div class="mode-row"><button class="mode active">In-person</button><button class="mode">Hybrid</button><button class="mode">Online</button></div>${btn('Generate lesson plan','primary','generate-lesson')}`) + `</div>`}`
}

function attendance() {
  const rows = [['CS301-01','Aarav Mehta','Present'],['CS301-02','Ishita Rao','Present'],['CS301-03','Kabir Shah','Absent'],['CS301-04','Meera Nair','Present'],['CS301-05','Rohan Iyer','Present'],['CS301-06','Sana Khan','Absent']]
  const register = rows.map(x => `<tr><td class="mono">${x[0]}</td><td><strong>${x[1]}</strong></td><td><button class="status-toggle ${x[2] === 'Present' ? 'present' : 'absent'}" data-action="toggle-attendance">${x[2] === 'Present' ? '✓ Present' : '× Absent'}</button></td><td><input class="table-input" placeholder="Add note" /></td></tr>`).join('')
  const attendanceCard = card('Attendance register <span class="card-sub">25 Nov 2026</span>', `<div class="table-tools"><div class="attendance-counts">${pill('38 present','success')}${pill('4 absent','warning')}</div><button class="btn small secondary" data-action="mark-all">Mark all present</button></div><div class="table-wrap"><table class="attendance-table"><thead><tr><th>Roll no.</th><th>Student</th><th>Status</th><th>Notes</th></tr></thead><tbody>${register}</tbody></table></div>`)
  const script = `Subject: Attendance follow-up · CS301

Hello Meera,

You were marked absent for today’s CS301 session. Please review the AVL tree rotation notes and reach out if you need any support.

Regards,
Dr. Ananya Deshmukh`
  const aiBody = '<div class="script-header"><span class="ai-orb small-orb">✦</span><div><h3>Generate a follow-up script</h3><p>Turn today’s register into a concise message or automation.</p></div></div><label class="field-label">What would you like to create?</label><div class="choice-list"><label><input type="radio" name="script" checked /> Absence follow-up message</label><label><input type="radio" name="script" /> Low attendance alert</label><label><input type="radio" name="script" /> Attendance summary for department</label></div>' + btn('Generate script','primary','generate-script') + '<div class="generated-script"><div class="script-title"><span>Generated message</span>' + pill('Draft','blue') + '</div><pre>' + script + '</pre><div class="script-actions">' + btn('Copy script','secondary','copy-script') + btn('Use in email','secondary','use-email') + '</div></div>'
  const aiCard = card('AI attendance scripting', aiBody)
  return pageHeader('Faculty operations', 'Attendance Management', 'Record attendance quickly and use AI to turn class data into scripts and insights.', btn('Save attendance', 'primary', 'save-attendance')) + `<div class="filters"><div class="field"><label>Course</label><select><option>CS301 · Data Structures & Algorithms</option><option>CS405 · Database Management Systems</option></select></div><div class="field"><label>Class date</label><input type="date" value="2026-11-25" /></div><div class="field"><label>Session</label><select><option>09:30 AM · Room 304</option><option>02:00 PM · Hybrid</option></select></div><div class="filter-summary"><span class="summary-number">38 / 42</span><span class="muted">present today</span></div></div><div class="two-col attendance-cols">${attendanceCard}${aiCard}</div>`
}

function assignments() {
  const generator = '<div class="script-header"><span class="ai-orb small-orb">✦</span><div><h3>Start with a brief</h3><p>Describe what you want students to practice. CampusPulse will structure the rest.</p></div></div><label class="field-label">Course</label><select class="input"><option>CS301 · Data Structures & Algorithms</option><option>CS405 · Database Management Systems</option></select><label class="field-label">Learning objective</label><textarea class="input textarea">Compare AVL tree rotations and explain how balancing impacts search complexity.</textarea><div class="form-row"><div><label class="field-label">Difficulty</label><select class="input"><option>Intermediate</option><option>Advanced</option></select></div><div><label class="field-label">Due date</label><input class="input" type="date" value="2026-12-04" /></div></div>'+btn('Generate assignment','primary','generate-assignment')
  const preview = '<div class="assignment-preview"><div class="preview-meta"><span class="mono">CS301 · Assignment 04</span>'+pill('Draft','blue')+'</div><h2 contenteditable="true">AVL Tree Rotations & Collision Resolution</h2><p class="muted">Data Structures & Algorithms · Due 04 Dec 2026</p><hr /><h3>Instructions</h3><p>Implement insertion and deletion in an AVL tree. Document each rotation performed and explain the resulting time complexity for each operation.</p><h3>Submission requirements</h3><ul class="clean-list"><li>Source code with meaningful comments</li><li>Rotation trace for the supplied input set</li><li>A short reflection on balancing trade-offs</li></ul><div class="preview-actions">'+btn('Save as draft','secondary','save-assignment')+btn('Publish to class','primary','publish-assignment')+'</div></div>'
  const rows = [['Assignment 03 · Graph Traversal','21 Nov 2026','38 / 42','82%','Closed'],['Assignment 02 · Hash Tables','07 Nov 2026','42 / 42','88%','Graded'],['Assignment 01 · Complexity Analysis','24 Oct 2026','41 / 42','79%','Graded']].map(x => '<tr><td><strong>'+x[0]+'</strong><span class="muted">CS301 · Semester V</span></td><td>'+x[1]+'</td><td>'+x[2]+'</td><td>'+x[3]+'</td><td>'+pill(x[4], x[4] === 'Closed' ? 'neutral' : 'success')+'</td></tr>').join('')
  return pageHeader('Faculty operations', 'Assignment Management', 'Create, distribute, and review coursework with a little help from AI.', btn('New assignment', 'primary', 'new-assignment')) + '<div class="two-col assignment-cols">'+card('AI assignment generator', generator)+card('Generated assignment', preview)+'</div><div class="section-heading"><h2>Class assignments & submissions</h2><span class="muted">CS301 · 42 students</span></div><div class="card table-wrap"><table><thead><tr><th>Assignment</th><th>Due date</th><th>Submitted</th><th>Average</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
}

function workflow() {
  const agents = [['Attendance analyst','Review attendance patterns','✓'],['Lesson planner','Structure your next class','◷'],['Assignment designer','Draft briefs and rubrics','▤'],['Student support','Prepare clear follow-ups','♧']]
  const suggestions = [['Review attendance','Find students who may need support','/attendance'],['Plan a lesson','Create a 55-minute teaching flow','/timetable'],['Draft an assignment','Turn an objective into coursework','/assignments'],['Summarize performance','Prepare a department-ready view','/courses']]
  const agentHtml = agents.map(x => '<button class="agent-item"><span class="agent-icon">'+x[2]+'</span><span><strong>'+x[0]+'</strong><small>'+x[1]+'</small></span><span>›</span></button>').join('')
  const suggestionHtml = suggestions.map(x => '<a href="'+x[2]+'" class="suggestion-card"><strong>'+x[0]+'</strong><span>'+x[1]+'</span><span class="arrow">→</span></a>').join('')
  const historyHtml = ['CS301 absence follow-up','AVL lesson plan','November performance summary'].map(x => '<button class="history-item">'+x+'<span>›</span></button>').join('')
  const body = '<div class="workflow-layout"><aside class="workflow-sidebar card"><div class="workflow-title"><span class="ai-orb small-orb">✦</span><strong>Specialized AI agents</strong></div>'+agentHtml+'<div class="history-label">Previous workflows</div>'+historyHtml+'</aside><section class="workflow-main card"><div class="conversation"><div class="assistant-message"><span class="ai-orb small-orb">✦</span><div><strong>CampusPulse AI</strong><p>Good morning, Dr. Deshmukh. What would you like to work on today?</p></div></div><div class="suggestion-grid">'+suggestionHtml+'</div></div><div class="composer"><textarea id="workflow-input" placeholder="Ask CampusPulse AI to help with a teaching task..."></textarea><div class="composer-bottom"><span class="muted">AI suggestions use your local academic workspace data.</span><button class="send-button" data-action="send-workflow">↑</button></div></div></section></div>'
  return pageHeader('AI workspace', 'AI Workflow Assistant', 'Connect a teaching task to a focused assistant, then keep the result in your academic workflow.', btn('New workflow', 'primary', 'new-workflow')) + body
}

function profile() {
  const publications = ['Adaptive graph embeddings for classroom knowledge maps','Explainable learning analytics for formative assessment','Efficient rotations in distributed search trees'].map((x,i) => '<div class="publication"><span class="pub-number">0'+(i+1)+'</span><div><strong>'+x+'</strong><p>Journal of Educational Computing · '+(2024-i)+'</p></div></div>').join('')
  const cv = card('Curriculum Vitae (CV)', '<div class="cv-section"><h3>Education</h3><div class="timeline-item"><span class="timeline-year mono">2016</span><div><strong>Ph.D. in Computer Science</strong><p>Indian Institute of Technology Bombay</p></div></div><div class="timeline-item"><span class="timeline-year mono">2011</span><div><strong>M.Tech. in Computer Science</strong><p>University of Pune</p></div></div></div><div class="cv-section"><h3>Selected publications</h3>'+publications+'</div>')
  const history = card('Teaching history <span class="card-sub">2019–2026</span>', '<div class="teaching-row"><span class="mono">2024–26</span><div><strong>Associate Professor</strong><p>Vidyasetu Institute of Technology</p></div></div><div class="teaching-row"><span class="mono">2019–24</span><div><strong>Assistant Professor</strong><p>Vidyasetu Institute of Technology</p></div></div>')
  const profileCard = '<section class="profile-card card"><div class="profile-hero"><div class="avatar large">AD</div><div><h2>Dr. Ananya Deshmukh</h2><p>Associate Professor · Computer Science & Engineering</p><span class="mono muted">EMP-2019-042 · ananya.deshmukh@campuspulse.edu</span></div><button class="icon-button">⋮</button></div><div class="profile-stats"><div><strong>7</strong><span>years teaching</span></div><div><strong>18</strong><span>publications</span></div><div><strong>04</strong><span>active courses</span></div></div><div class="profile-section"><h3>Research interests</h3><div class="tag-list"><span>Algorithms</span><span>Data Structures</span><span>AI in Education</span><span>Graph Theory</span><span>Learning Analytics</span></div></div><div class="profile-section"><h3>Office hours</h3><p>Tuesday & Thursday · 3:00 – 5:00 PM<br /><span class="muted">Department of Computer Science · Room 412</span></p></div></section>'
  return pageHeader('Faculty workspace', 'Faculty Profile & Academic Portfolio', 'Keep your teaching identity, research interests, and CV ready to share.', btn('Export PDF', 'primary', 'export-pdf')) + '<div class="profile-layout">'+profileCard+'<div class="cv-column">'+cv+history+'</div></div>'
}

function render() {
  const pages = { dashboard, courses, timetable, attendance, assignments, workflow, profile }
  document.querySelector('#app').innerHTML = shell(pages[activeRoute]())
  bindEvents()
}

function toast(message) { const el = document.querySelector('#toast'); if (!el) return; el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600) }
function bindEvents() {
  document.querySelectorAll('[data-action="collapse"]').forEach(el => el.onclick = () => { collapsed = !collapsed; render() })
  document.querySelectorAll('[data-action="profile"]').forEach(el => el.onclick = () => navigate('profile'))
  document.querySelectorAll('[data-action="logout"]').forEach(el => el.onclick = async () => { try { const { error } = await portalAuth?.client.auth.signOut(); if (error) throw error; location.replace('/') } catch (error) { toast(error.message || 'Could not sign out.') } })
  document.querySelectorAll('[data-action="notify"]').forEach(el => el.onclick = () => toast('Notifications are sample content in this local demo; no live notification service is connected.'))
  document.querySelectorAll('[data-action="new"], [data-action="new-workflow"]').forEach(el => el.onclick = () => toast('Local demo only: no workflow was created or queued. Your page data remains unchanged.'))
  document.querySelectorAll('[data-action="save-attendance"]').forEach(el => el.onclick = () => toast('Local demo only: attendance was not saved or sent.'))
  document.querySelectorAll('[data-action="mark-all"]').forEach(el => el.onclick = () => { document.querySelectorAll('[data-action="toggle-attendance"]').forEach(button => { button.classList.add('present'); button.classList.remove('absent'); button.textContent = '✓ Present' }); toast('Changed attendance in this page only; nothing was saved or sent.') })
  document.querySelectorAll('[data-action="toggle-attendance"]').forEach(el => el.onclick = () => { el.classList.toggle('present'); el.classList.toggle('absent'); el.textContent = el.classList.contains('present') ? '✓ Present' : '× Absent'; el.setAttribute('aria-pressed', el.classList.contains('present') ? 'true' : 'false') })
  document.querySelectorAll('[data-action="generate-script"], [data-action="generate-assignment"], [data-action="generate-lesson"]').forEach(el => el.onclick = () => toast('Local demo only: no AI generation ran and no content was created. Edit the visible draft yourself; nothing is saved.'))
  document.querySelectorAll('[data-action="save-assignment"]').forEach(el => el.onclick = () => toast('Local demo only: assignment was not saved. Your visible draft remains on this page.'))
  document.querySelectorAll('[data-action="publish-assignment"]').forEach(el => el.onclick = () => toast('Local demo only: assignment was not published or sent to students.'))
  document.querySelectorAll('[data-action="export-pdf"]').forEach(el => el.onclick = () => toast('Local demo only: no PDF was generated or exported.'))
  document.querySelectorAll('[data-action="send-workflow"]').forEach(el => el.onclick = () => { const input = document.querySelector('#workflow-input'); toast(input?.value.trim() ? 'Local demo only: request was not sent or queued. Your text has been kept.' : 'Enter a request first. Sending is unavailable in this local demo; no request will be sent.') })
  document.querySelectorAll('[data-action="copy-script"]').forEach(el => el.onclick = async () => { const text = el.closest('.generated-script')?.querySelector('pre')?.textContent || ''; try { await navigator.clipboard.writeText(text); toast('Copied the visible sample script locally; it was not generated or sent.') } catch { toast('Clipboard access unavailable. Select and copy the visible sample script manually.') } })
  document.querySelectorAll('[data-action="use-email"]').forEach(el => { el.disabled = true; el.title = 'Email sending is unavailable in this local demo'; el.setAttribute('aria-label', 'Use in email unavailable; no email service is connected') })
  document.querySelectorAll('[data-action="lesson"]').forEach(el => el.onclick = () => { const topic = document.querySelector('.ai-panel')?.nextElementSibling?.nextElementSibling; topic?.focus(); toast('Lesson topic field focused. This local demo cannot create or save a lesson plan.') })
  document.querySelectorAll('[data-action="open-class"]').forEach(el => { el.disabled = true; el.title = 'Class launch requires a connected service'; el.setAttribute('aria-label', 'Open class unavailable in this local demo') })
  document.querySelectorAll('.segmented button, .agent-item, .history-item, .profile-hero .icon-button').forEach(el => { el.disabled = true; el.title = 'Not available in this local demo'; el.setAttribute('aria-disabled', 'true') })
  document.querySelectorAll('.mode').forEach(el => el.onclick = () => { el.parentElement.querySelectorAll('.mode').forEach(b => b.classList.remove('active')); el.classList.add('active'); toast('Teaching mode changed on this page only; no lesson was saved.') })
  document.querySelectorAll('.table-tools select').forEach(select => select.onchange = () => { const value = select.value; document.querySelectorAll('.table-wrap tbody tr').forEach(row => { const status = row.lastElementChild.textContent; row.hidden = value === 'Top performers' ? !status.includes('Excellent') : value === 'Needs attention' ? !status.includes('Attention') : false }) })
}
function navigate(route) { history.pushState({}, '', route === 'dashboard' ? '/' : '/' + route); activeRoute = route; render() }
document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a && a.origin === location.origin && !a.getAttribute('href').startsWith('#')) { e.preventDefault(); navigate(a.getAttribute('href').slice(1) || 'dashboard') } })
window.addEventListener('popstate', () => { activeRoute = routeFromPath(); render() })
startPortalAuth({ onAuthorized: (session) => { portalAuth = session; render() } })
