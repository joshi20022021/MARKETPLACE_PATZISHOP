import { createDatabaseClient } from '../src/config/database';
import { seedCategories } from './categories';

async function main(): Promise<void> {
  const prisma = createDatabaseClient();
  try {
    await seedCategories(prisma);
    process.stdout.write(
      'Seed OK: ocho slugs base asegurados, sin sobrescribir categorías existentes ni crear credenciales.\n',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  process.stderr.write('No se pudo ejecutar el seed. Revisa la conexión y las migraciones.\n');
  process.exitCode = 1;
});
