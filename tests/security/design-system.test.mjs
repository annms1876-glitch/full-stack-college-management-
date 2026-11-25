import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
async function htmlFiles(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

const [homeCss, adminCss, facultyCss, adminHtml, facultyHtml, generatedCss] = await Promise.all([
  read('../../campuspulse-frontend/public/home.css'),
  read('../../campuspulse-admin-dashboard/src/styles.css'),
  read('../../campuspulse-frontend/faculty-dashboard/src/styles.css'),
  read('../../campuspulse-admin-dashboard/index.html'),
  read('../../campuspulse-frontend/faculty-dashboard/index.html'),
  read('../../campuspulse-frontend/public/campuspulse-tailwind.css'),
]);

const studentFiles = await htmlFiles(new URL('../../campuspulse-frontend/public/screens/', import.meta.url));
const studentPages = await Promise.all(studentFiles.map(async (file) => [file.pathname, await readFile(file, 'utf8')]));

test('student screens use a shared local stylesheet and do not load Tailwind JIT from a CDN', () => {
  assert.ok(studentPages.length >= 12, 'all student screens should be covered');
  for (const [file, html] of studentPages) {
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com|id="tailwind-config"/, file);
    assert.match(html, /DM\+Sans/, file);
    assert.match(html, /Manrope/, file);
    assert.doesNotMatch(html, /Instrument Sans|Alata|Spline Sans Mono/, file);
    if (!/\/screens\/(?:light|dark)\/login\.html$/.test(file)) {
      assert.match(html, /href="\/campuspulse-tailwind\.css"/, file);
    }
  }
  assert.ok(generatedCss.length > 10_000 && generatedCss.length < 60_000, 'compiled CSS should be present and compact');
});

test('all portals use homepage DM Sans/Manrope typography and CampusPulse palette', () => {
  assert.match(homeCss, /--ink:#17241e/);
  assert.match(homeCss, /--paper:#f7f6f1/);
  assert.match(homeCss, /--green:#345f47/);
  assert.match(homeCss, /--lime:#d8f078/);
  assert.doesNotMatch(homeCss, /@import\s+url\(/);
  assert.match(adminCss, /--primary:\s*#345f47/);
  assert.match(facultyCss, /--primary:#345f47/);
  for (const html of [adminHtml, facultyHtml]) {
    assert.match(html, /DM\+Sans/);
    assert.match(html, /Manrope/);
    assert.doesNotMatch(html, /Instrument\+Sans|Mulish|Red\+Hat/);
  }
  assert.doesNotMatch(adminCss + facultyCss, /Instrument Sans|Mulish|Red Hat|Source Code Pro/);
});
