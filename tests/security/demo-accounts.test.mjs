import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const accounts = JSON.parse(await readFile(resolve('scripts/demo-accounts.json'), 'utf8'));
test('demo accounts cover each supported role without using real-looking production domains', () => {
  assert.deepEqual(accounts.map(account => account.role).sort(), ['admin', 'faculty', 'student']);
  assert.equal(new Set(accounts.map(account => account.email)).size, 3);
  assert.ok(accounts.every(account => account.email.endsWith('@campuspulse.test')));
  assert.ok(accounts.every(account => account.password.length >= 16));
});
