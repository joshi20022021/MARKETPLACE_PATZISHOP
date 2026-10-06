import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import process from 'node:process';
import { URL } from 'node:url';

const root = new URL('../', import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const [major, minor] = process.versions.node.split('.').map(Number);
assert(major === 22 && minor >= 18, 'Utiliza Node.js 22.18 o una versión posterior de Node 22.');

const manifest = await readJson('package.json');
assert.equal(manifest.private, true, 'El repositorio debe ser privado para npm.');
assert.deepEqual(manifest.workspaces, ['frontend', 'backend']);

for (const workspace of manifest.workspaces) {
  const pkg = await readJson(`${workspace}/package.json`);
  assert.equal(pkg.private, true);
  assert(pkg.name.startsWith('@marketplace/'));
  assert((await stat(new URL(`${workspace}/src/`, root))).isDirectory());
  await stat(new URL(`${workspace}/.env.example`, root));
}

const config = await readJson('tsconfig.base.json');
assert.equal(config.compilerOptions.strict, true);
const ignore = await readFile(new URL('.gitignore', root), 'utf8');
for (const pattern of ['node_modules/', '.env', 'dist/', '!**/.env.example']) {
  assert(ignore.split(/\r?\n/u).includes(pattern), `Falta ${pattern} en .gitignore.`);
}

await stat(new URL('package-lock.json', root));
process.stdout.write(
  'FASE 1 OK: Node, workspaces, estructura, TypeScript estricto y configuración.\n',
);
