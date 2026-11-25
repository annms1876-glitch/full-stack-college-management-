import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [home, studentTheme, studentBuilder, studentServer, facultyTheme, facultyMain, facultyCss, adminTheme, adminApp, adminCss] = await Promise.all([
  read('../../campuspulse-frontend/public/home.html'),
  read('../../campuspulse-frontend/public/theme-toggle.js'),
  read('../../campuspulse-frontend/scripts/build-vercel.mjs'),
  read('../../campuspulse-frontend/server.js'),
  read('../../campuspulse-frontend/faculty-dashboard/src/theme.js'),
  read('../../campuspulse-frontend/faculty-dashboard/src/main.js'),
  read('../../campuspulse-frontend/faculty-dashboard/src/styles.css'),
  read('../../campuspulse-admin-dashboard/src/theme.js'),
  read('../../campuspulse-admin-dashboard/src/app.js'),
  read('../../campuspulse-admin-dashboard/src/styles.css'),
]);

test('homepage retains student login and sends faculty/admin to separate sign-in portals', () => {
  assert.match(home, /href="\/login" aria-label="Log in as a student"/);
  assert.match(home, /data-portal-link="faculty" href="https:\/\/campuspulse-faculty\.vercel\.app\//);
  assert.match(home, /data-portal-link="admin" href="https:\/\/campuspulse-admin\.vercel\.app\//);
  assert.match(home, /facultyPortalUrl/);
  assert.match(home, /adminPortalUrl/);
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
