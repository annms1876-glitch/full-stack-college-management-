# full-stack-college-management-

VC hackathon college management

## Student Profile — CampusPulse frontend

This repository now includes the standalone CampusPulse frontend under `campuspulse-frontend/`. It contains the Student Profile screen and related student-facing college views, with both light and dark themes. The frontend is a visual prototype: login, likes, saved posts, event registration, and similar actions use temporary browser-side state; authentication and persistent user data are not connected to a backend.

### Run locally

```bash
cd campuspulse-frontend
node server.js
```

Open `http://localhost:3000/profile` for the Student Profile screen. The server uses port `3000` by default; set `PORT` to use another port.

### Student Profile screens

- `/profile` — Student Profile and academic overview (light theme)
- `/dark/profile` — Student Profile and academic overview (dark theme)

The theme switcher and in-app navigation are available from the screens. The complete route list is in [`campuspulse-frontend/README.md`](campuspulse-frontend/README.md), and the design reference is in [`campuspulse-frontend/public/design-system.md`](campuspulse-frontend/public/design-system.md).

### Frontend structure

```text
campuspulse-frontend/
├── server.js                     # Dependency-free Node.js static server and page routes
├── README.md                     # Frontend setup, routes, and behavior
└── public/
    ├── app.js                     # Shared navigation, theme routing, and interactions
    ├── brand/campus-logo-144-712f764a4b82.webp  # Shared optimized logo
    ├── brand/campus-logo.png
    ├── design-system.md
    ├── manus-routes.json          # Declared page routes
    └── screens/
        ├── light/                 # Six light-theme screens
        └── dark/                  # Six dark-theme screens
```

### Asset note

The logo is included in the repository. Some campus and student photos use `/manus-storage/...` project-managed asset paths; those image files are not part of this repository. For a standalone deployment, mirror those images to your own image storage and update the mappings in `campuspulse-frontend/server.js`.

## Faculty dashboard frontend

The repository now also includes a responsive CampusPulse faculty workspace under [`campuspulse-frontend/faculty-dashboard/`](campuspulse-frontend/faculty-dashboard/). It preserves the existing student frontend and adds a separate faculty-dashboard application based on the supplied faculty portal design.

The faculty frontend includes the dashboard overview, attendance register and AI scripting, assignment management and AI generator, timetable and hybrid teaching, courses and performance, AI workflow assistant, and faculty profile/CV screens.

### Faculty routes

| Route | Screen |
| --- | --- |
| `/` | Faculty dashboard overview |
| `/courses` | Courses, performance, materials, and notices |
| `/timetable` | Timetable, hybrid teaching, and lesson AI |
| `/attendance` | Attendance register and AI scripting |
| `/assignments` | Assignment management and AI generator |
| `/workflow` | AI workflow assistant |
| `/profile` | Faculty profile and academic CV |

### Run the faculty dashboard locally

```bash
cd campuspulse-frontend/faculty-dashboard
npm install
npm run dev
```

The Vite development server listens on port `3000`. Create a production build with `npm run build`; output is written to `dist/` and ignored by Git. The route manifest is available at [`campuspulse-frontend/faculty-dashboard/public/manus-routes.json`](campuspulse-frontend/faculty-dashboard/public/manus-routes.json).

The faculty dashboard is intentionally frontend-only for this deliverable. Screens use local mock data and browser-side interactions; authentication, persistence, APIs, and database wiring are not included.

### Updated structure

```text
campuspulse-frontend/
├── faculty-dashboard/          # Responsive Vite faculty portal frontend
│   ├── src/main.js             # Routes, mock data, and interactions
│   ├── src/styles.css          # CampusPulse design system and responsive styles
│   ├── public/manus-routes.json
│   ├── package.json
│   └── README.md
├── public/                     # Existing student frontend assets and screens
├── server.js                   # Existing student static server
└── README.md
```
