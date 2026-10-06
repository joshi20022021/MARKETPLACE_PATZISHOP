import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));

function docker(args) {
  const result = spawnSync('docker', args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) {
    process.stderr.write(
      'No se pudo ejecutar Docker. Comprueba la instalación y Docker Desktop.\n',
    );
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

docker(['compose', 'config', '--quiet']);
docker([
  'compose',
  'exec',
  '-T',
  'postgres',
  'sh',
  '-c',
  'PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "SELECT current_database() AS database, current_user AS username, version();"',
]);
process.stdout.write('FASE 2 OK: configuración Compose y conexión SQL autenticada por TCP.\n');
