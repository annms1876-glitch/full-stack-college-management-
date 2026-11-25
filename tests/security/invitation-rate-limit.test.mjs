import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [inviteFunction, migration] = await Promise.all([
  read('../../supabase/functions/invite-user/index.ts'),
  read('../../supabase/migrations/202611260007_invite_user_rate_limit.sql'),
]);

test('invite-user throttling matches a fixed database allowlist and remains service-role-only', () => {
  assert.match(inviteFunction, /consumeLimit\(caller, "invite-user", 5, 60\)/);
  assert.match(migration, /p_action not in \('ai-assistant', 'grant-role', 'invite-user'\)/);
  assert.match(migration, /p_action = 'invite-user' and \(p_max_requests <> 5 or p_window_seconds <> 60\)/);
  assert.match(migration, /revoke all on function public\.consume_user_rate_limit\(uuid, text, integer, integer\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.consume_user_rate_limit\(uuid, text, integer, integer\) to service_role/i);
});
