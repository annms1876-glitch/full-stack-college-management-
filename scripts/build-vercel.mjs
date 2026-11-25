import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(root, 'campuspulse-frontend');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, ['campuspulse-frontend/scripts/build-vercel.mjs'], root);

const portals = [
  {
    name: 'Faculty',
    directory: path.join(frontend, 'faculty-dashboard'),
    base: '/faculty/',
    output: '../dist/faculty',
  },
  {
    name: 'Admin',
    directory: path.join(root, 'campuspulse-admin-dashboard'),
    base: '/admin/',
    output: '../campuspulse-frontend/dist/admin',
  },
];

for (const portal of portals) {
  console.log(`\nInstalling ${portal.name} portal dependencies...`);
  run('npm', ['ci', '--no-audit', '--no-fund'], portal.directory);
  console.log(`Building ${portal.name} portal at ${portal.base}...`);
  run('npm', ['run', 'build', '--', `--base=${portal.base}`, `--outDir=${portal.output}`, '--emptyOutDir'], portal.directory);
}
