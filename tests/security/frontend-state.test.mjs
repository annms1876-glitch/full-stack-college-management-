import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [app, lightClubs, darkClubs] = await Promise.all([
  read('../../campuspulse-frontend/public/app.js'),
  read('../../campuspulse-frontend/public/screens/light/clubs.html'),
  read('../../campuspulse-frontend/public/screens/dark/clubs.html'),
]);

test('club cards do not claim membership until the backend confirms it', () => {
  for (const page of [lightClubs, darkClubs]) {
    assert.doesNotMatch(page, /Joined\s*✓/);
    assert.match(page, /data-joined="false">Join Club/);
  }
  assert.match(app, /querySelectorAll\("\.join-club-btn"\)/);
  const write = app.indexOf('await api.joinClub(club.id,joining)');
  const membershipUpdate = app.indexOf('club.club_members=joining?', write);
  const buttonUpdate = app.indexOf('replacement.textContent=joining?', write);
  assert.ok(write >= 0 && membershipUpdate > write && buttonUpdate > write,
    'membership UI state must change only after the API call resolves');
});
