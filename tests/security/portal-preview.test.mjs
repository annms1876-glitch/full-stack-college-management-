import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [packageText, readme] = await Promise.all([
  readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../../README.md', import.meta.url), 'utf8'),
]);

const packageJson = JSON.parse(packageText);

test('the root preview builds all portal outputs before serving one origin', () => {
  assert.equal(packageJson.scripts.preview, 'npm run build:vercel && node campuspulse-frontend/server.js');
  assert.match(readme, /cd full-stack-college-management-\s+npm ci\s+npm run preview/);
  assert.match(readme, /Faculty portal: `\/faculty\/`/);
  assert.match(readme, /Admin portal: `\/admin\/`/);
});
