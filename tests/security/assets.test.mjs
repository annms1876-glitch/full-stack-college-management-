import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [server, build, studentApp] = await Promise.all([
  read('../../campuspulse-frontend/server.js'),
  read('../../campuspulse-frontend/scripts/build-vercel.mjs'),
  read('../../campuspulse-frontend/public/app.js'),
]);

const assetDirectory = new URL('../../campuspulse-frontend/public/assets/', import.meta.url);
const assetNames = await readdir(assetDirectory);

test('no source, HTML or server file references the uncommitted /manus-storage/ paths', async () => {
  assert.doesNotMatch(server, /manus-storage/);
  assert.doesNotMatch(build, /manus-storage/);
  assert.doesNotMatch(studentApp, /manus-storage/);
  for (const screen of ['light', 'dark']) {
    for (const page of ['home', 'feed', 'login', 'faculty', 'profile', 'study', 'clubs']) {
      const file = screen === 'light' && page === 'home' ? '../../campuspulse-frontend/public/home.html' : `../../campuspulse-frontend/public/screens/${screen}/${page}.html`;
      try {
        const html = await read(file);
        assert.doesNotMatch(html, /\/manus-storage\//, file);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
});

test('every runtime image replacement resolves to a committed local asset', async () => {
  const mapping = server.match(/const IMAGE_REPLACEMENTS = \{([\s\S]*?)\};/)?.[1] || '';
  const targets = [...mapping.matchAll(/"([^"]+)":\s*"(\/[^"]+)"/g)].map(match => match[2]);
  assert.ok(targets.length >= 7, 'all legacy image keys must be mapped');
  for (const target of targets) {
    assert.match(target, /^\/(assets|brand)\//, `unexpected remote target ${target}`);
    const relative = target.startsWith('/assets/') ? target.slice('/assets/'.length) : null;
    if (relative) {
      assert.ok(assetNames.includes(relative), `missing committed asset ${relative}`);
      await stat(new URL(relative, assetDirectory));
    }
  }
});

test('the production build rewrites the same illustration set', () => {
  const mapping = build.match(/const replace = new Map\(\[([\s\S]*?)\]\);/)?.[1] || '';
  const targets = [...mapping.matchAll(/'(\/[^']+)'/g)].map(match => match[1]);
  assert.ok(targets.length >= 7);
  for (const target of targets) assert.match(target, /^\/(assets|brand)\//);
  assert.match(build, /campuspulse-hero-campus\.svg/);
  assert.match(server, /campuspulse-hero-campus\.svg/);
});

test('committed illustration assets are real SVG documents', async () => {
  const svgs = assetNames.filter(name => name.endsWith('.svg'));
  assert.ok(svgs.length >= 5, 'expected the campus illustration set');
  for (const name of svgs) {
    const svg = await readFile(new URL(name, assetDirectory), 'utf8');
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, name);
    assert.match(svg, /role="img"/, name);
    assert.match(svg, /aria-label="/, name);
  }
});
