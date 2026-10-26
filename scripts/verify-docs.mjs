import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const files = ['README.md', 'CHANGELOG.md'];
async function discover(directory) {
  for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await discover(path);
    else if (entry.name.endsWith('.md')) files.push(path);
  }
}
await discover('docs');
let links = 0;
let commands = 0;
const failures = [];
for (const file of files) {
  const content = await readFile(resolve(root, file), 'utf8');
  for (const match of content.matchAll(/!?\[[^\]]*\]\(<?([^\s)>]+)>?\)/gu)) {
    const target = match[1];
    if (/^(?:[a-z]+:|#)/iu.test(target)) continue;
    const path = decodeURIComponent(target.split('#')[0]);
    const absolute = resolve(dirname(resolve(root, file)), path);
    const local = relative(root, absolute);
    try {
      assert(local !== '..' && !local.startsWith(`..${sep}`), 'Destino fuera del repositorio.');
      assert((await stat(absolute)).isFile(), 'El destino no es un archivo.');
      links++;
    } catch {
      failures.push(`${file}: enlace local no valido: ${target}`);
    }
  }
  for (const match of content.matchAll(/npm run ([a-z\d][a-z\d:-]*)/giu)) {
    if (!Object.hasOwn(manifest.scripts, match[1]))
      failures.push(`${file}: script root inexistente: ${match[1]}`);
    commands++;
  }
}
if (failures.length) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `DOCS OK: ${files.length} documentos, ${links} enlaces locales y ${commands} referencias a scripts root.\n`,
  );
}
