import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const portalThemes = [
  ['Faculty', '../../campuspulse-frontend/faculty-dashboard/src/theme.js'],
  ['Admin', '../../campuspulse-admin-dashboard/src/theme.js'],
];

for (const [portal, path] of portalThemes) {
  test(`${portal} theme observer leaves an unchanged icon node alone`, async () => {
    const source = (await readFile(new URL(path, import.meta.url), 'utf8'))
      .replace('export function initializeTheme()', 'function initializeTheme()');
    let text = '☾';
    let writes = 0;
    const icon = {
      get textContent() { return text; },
      set textContent(value) { writes += 1; text = value; },
    };
    const button = {
      title: '',
      setAttribute() {},
      querySelector(selector) { return selector === '[data-theme-icon]' ? icon : null; },
    };
    const context = {
      document: { querySelectorAll() { return [button]; } },
    };
    vm.runInNewContext(`${source}\nglobalThis.syncControlsForTest = syncControls;`, context);

    context.syncControlsForTest('light');
    assert.equal(writes, 0, 'the current light icon should not be replaced again');
    context.syncControlsForTest('dark');
    assert.equal(text, '☀');
    assert.equal(writes, 1, 'changing the theme should update the icon once');
    context.syncControlsForTest('dark');
    assert.equal(writes, 1, 're-syncing the same theme must not create another child-list mutation');
  });
}
