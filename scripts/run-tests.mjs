import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';
import { root, testEnvironment, fixtureCounts } from './test-environment.mjs';
import assert from 'node:assert/strict';
// Invoke npm's JS entry point so Windows never needs a shell or command-string interpolation.
async function run(command, args, cwd, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('exit', (code, signal) =>
      code === 0
        ? resolve()
        : reject(new Error(`Comprobación fallida (${signal ?? code ?? 'sin código'}).`)),
    );
  });
}
async function main() {
  const mode = process.argv[2] ?? 'all';
  if (!['all', 'backend', 'unit', 'journey', 'boundary', 'migrate'].includes(mode))
    throw new Error('Modo de pruebas desconocido.');
  const cwd = fileURLToPath(root);
  const backend = fileURLToPath(new URL('backend/', root));
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error('Usa los comandos npm documentados.');
  const env = mode === 'unit' ? process.env : await testEnvironment();
  if (['all', 'unit'].includes(mode))
    await run(process.execPath, ['--test', 'scripts/test-environment.test.mjs'], cwd);
  if (mode === 'migrate') {
    await run(process.execPath, [npm, 'run', 'prisma:deploy', '--workspace', 'backend'], cwd, env);
    return;
  }
  await run(
    process.execPath,
    [fileURLToPath(new URL('node_modules/typescript/bin/tsc', root)), '-p', 'tsconfig.test.json'],
    backend,
    env,
  );
  const files = (await readdir(new URL('backend/test/', root)))
    .filter((name) => name.endsWith('.test.ts'))
    .map((name) => name.replace(/\.ts$/u, '.js'))
    .filter((name) =>
      mode === 'unit'
        ? name.endsWith('.unit.test.js')
        : mode === 'journey'
          ? name === 'marketplace-journey.e2e.test.js'
          : mode === 'boundary'
            ? name === 'http-boundary.e2e.test.js'
            : true,
    )
    .sort()
    .map((name) => `.test-dist/test/${name}`);
  if (!files.length) throw new Error('No se encontraron pruebas para este modo.');
  console.log(`Backend: ${files.length} archivos, ejecución secuencial (${mode}).`);
  const before = mode === 'unit' ? null : await fixtureCounts(env.DATABASE_URL);
  try {
    await run(process.execPath, ['--test', '--test-concurrency=1', ...files], backend, env);
  } finally {
    if (before) {
      assert.deepEqual(
        await fixtureCounts(env.DATABASE_URL),
        before,
        'Quedaron filas de fixtures; revisar limpieza de las pruebas.',
      );
      console.log('Limpieza verificada: conteos de 13 tablas conservados.');
    }
  }
  if (mode === 'all') await run(process.execPath, [npm, 'run', 'test:frontend'], cwd, env);
}
void main().catch(() => {
  console.error(
    'La ejecución de pruebas falló. Revisa el diagnóstico anterior y la preparación en docs/testing.md.',
  );
  process.exitCode = 1;
});
