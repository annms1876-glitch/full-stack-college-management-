import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [home, studentTheme, studentBuilder, studentServer, studentApp, routeManifest, rootConfig, facultyTheme, facultyMain, facultyCss, adminTheme, adminApp, adminCss] = await Promise.all([
  read('../../campuspulse-frontend/public/home.html'),
  read('../../campuspulse-frontend/public/theme-toggle.js'),
  read('../../campuspulse-frontend/scripts/build-vercel.mjs'),
  read('../../campuspulse-frontend/server.js'),
  read('../../campuspulse-frontend/public/app.js'),
  read('../../campuspulse-frontend/public/manus-routes.json'),
  read('../../vercel.json'),
  read('../../campuspulse-frontend/faculty-dashboard/src/theme.js'),
  read('../../campuspulse-frontend/faculty-dashboard/src/main.js'),
  read('../../campuspulse-frontend/faculty-dashboard/src/styles.css'),
  read('../../campuspulse-admin-dashboard/src/theme.js'),
  read('../../campuspulse-admin-dashboard/src/app.js'),
  read('../../campuspulse-admin-dashboard/src/styles.css'),
]);

test('homepage portal cards point to same-origin sign-in paths', () => {
  assert.match(home, /href="\/login" aria-label="Log in as a student"/);
  assert.match(home, /href="\/faculty\/" aria-label="Open the Faculty sign-in portal"/);
  assert.match(home, /href="\/admin\/" aria-label="Open the Admin sign-in portal"/);
  assert.doesNotMatch(home, /campuspulse-(?:faculty|admin)\.vercel\.app|facultyPortalUrl|adminPortalUrl/);
});

test('Student faculty directory remains available without colliding with the Faculty portal mount', () => {
  assert.match(studentApp, /directory\/faculty/);
  assert.match(studentServer, /"\/directory\/faculty": "\/screens\/light\/faculty\.html"/);
  assert.match(studentTheme, /\['\/directory\/faculty', '\/dark\/directory\/faculty'\]/);
  assert.match(rootConfig, /"source": "\/directory\/faculty"/);
  assert.match(rootConfig, /"source": "\/faculty\/attendance"/);
  assert.match(routeManifest, /"path": "\/directory\/faculty"/);
  assert.doesNotMatch(rootConfig, /"source": "\/faculty", "destination": "\/screens\/light\/faculty\.html"/);
});

test('student theme runtime is included in production and local HTML pages', () => {
  assert.match(studentBuilder, /src="\/theme-toggle\.js"/);
  assert.match(studentServer, /src="\/theme-toggle\.js"/);
  assert.match(studentTheme, /campuspulse-theme/);
  assert.match(studentTheme, /prefers-reduced-motion/);
  assert.match(studentTheme, /campuspulse-theme-reveal/);
  assert.match(studentTheme, /\['\/login', '\/dark\/login'\]/);
});

test('faculty and admin expose pre-authenticated and dashboard theme controls with saved radial themes', () => {
  for (const source of [facultyTheme, adminTheme]) {
    assert.match(source, /campuspulse-theme/);
    assert.match(source, /localStorage\.setItem\(THEME_KEY, next\)/);
    assert.match(source, /campuspulse-theme-reveal/);
    assert.match(source, /prefers-reduced-motion/);
    assert.match(source, /campuspulse-theme-toggle-floating/);
  }
  assert.match(facultyMain, /data-theme-toggle/);
  assert.match(adminApp, /data-theme-toggle/);
  assert.match(facultyCss, /@keyframes campuspulse-radial-reveal/);
  assert.match(adminCss, /@keyframes campuspulse-radial-reveal/);
});
