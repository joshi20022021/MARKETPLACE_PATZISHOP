import { createDatabaseClient } from '../config/database';
import { provisionAdmin } from './provision-admin';
async function main() {
  const db = createDatabaseClient();
  try {
    await provisionAdmin(db, {
      name: process.env.PATZISHOP_ADMIN_NAME,
      email: process.env.PATZISHOP_ADMIN_EMAIL,
      password: process.env.PATZISHOP_ADMIN_PASSWORD,
    });
    console.log('Cuenta administradora creada. Ingresa desde /ingresar.');
  } finally {
    await db.$disconnect();
  }
}
void main().catch((error: unknown) => {
  const known =
    error instanceof Error &&
    (error.message.startsWith('Configura nombre') ||
      error.message.startsWith('El correo ya existe'));
  console.error(
    known
      ? error.message
      : 'No se pudo crear la cuenta. Revisa el entorno y la conexión privada a PostgreSQL.',
  );
  process.exitCode = 1;
});
