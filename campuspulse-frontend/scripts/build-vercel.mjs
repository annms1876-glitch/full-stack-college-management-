import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public');
const output = path.join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true, force: true });
const tailwind = [
  path.join(root, '..', 'node_modules', '.bin', 'tailwindcss'),
  path.join(root, 'node_modules', '.bin', 'tailwindcss'),
].find(existsSync);
if (!tailwind) throw new Error('Tailwind CLI is missing; install the repository or frontend dependencies first.');
const built = spawnSync(tailwind, ['-i', 'campuspulse-frontend/public/tailwind-input.css', '-o', 'campuspulse-frontend/dist/campuspulse-tailwind.css', '--config', 'tailwind.config.cjs', '--minify'], { cwd: path.join(root, '..'), stdio: 'inherit' });
if (built.status !== 0) process.exit(built.status ?? 1);
await cp(path.join(output, 'home.html'), path.join(output, 'index.html'));
const replace = new Map([
  ['ALJJyrDerPS2l3M99', '/brand/campus-logo.png'], ['ALJJyrBWzizFfB_K', '/brand/campus-logo.png'],
  ['ALJJyrD27Av7MK_', '/brand/campus-logo-144-712f764a4b82.webp'],
  ['ALJJyrBXDQY-wzzb', '/assets/campuspulse-campus-hero.png'],
  ['ALJJyrC_eoL-ICo', '/assets/campuspulse-campus-hero.png'],
  ['ALJJyrDF4dExuwU9', '/assets/campuspulse-campus-hero.png'], ['ALJJyrABqBD-QY0j', '/assets/campuspulse-campus-hero.png'],
]);
async function processDirectory(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await processDirectory(file);
    else if (entry.name.endsWith('.html')) {
      let html = await readFile(file, 'utf8');
      html = html.replace(/https:\/\/lh3\.googleusercontent\.com\/aida\/[^"'\s)<>]+/g, (url) => {
        for (const [key, value] of replace) if (url.includes(key)) return value;
        return url;
      });
      if (!/^\/screens\/(?:light|dark)\/login\.html$/.test('/' + path.relative(output, file).split(path.sep).join('/'))) {
        html = html.replace(/<\/body>/i, '<script type="module" src="/app.js"></script></body>');
      }
      if (!html.includes('src="/theme-toggle.js"')) {
        html = html.replace(/<\/body>/i, '<script type="module" src="/theme-toggle.js"></script></body>');
      }
      await writeFile(file, html);
    }
  }
}
await processDirectory(output);
