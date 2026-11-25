# CampusPulse Faculty Dashboard

Responsive frontend for the CampusPulse faculty academic workspace. This application is based on the supplied faculty portal design reference and uses a reusable sidebar shell, responsive cards, data tables, forms, status pills, indigo AI accents, and local mock interactions.

## Screens

- `/` — Faculty dashboard overview
- `/courses` — Courses, performance, materials, and notices
- `/timetable` — Timetable, hybrid teaching, and lesson AI
- `/attendance` — Attendance register and AI scripting
- `/assignments` — Assignment management and AI generator
- `/workflow` — AI workflow assistant
- `/profile` — Faculty profile and academic CV

## Local development

```bash
npm install
npm run dev
```

The Vite server listens on port `3000`. Build for production with:

```bash
npm run build
```

## Implementation

The frontend is intentionally frontend-only. Screens render from local mock data in `src/main.js`; buttons, navigation, attendance toggles, workflow submission, and action feedback are implemented in the browser without a backend. Styling is centralized in `src/styles.css` and follows the supplied CampusPulse design language: Red Hat Text headings, Instrument Sans body copy, Red Hat Mono academic metadata, neutral surfaces, hairline borders, soft card radii, and restrained indigo/blue accents.
