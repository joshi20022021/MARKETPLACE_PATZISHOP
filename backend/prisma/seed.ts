import { createDatabaseClient } from '../src/config/database';

const categories = [
  { name: 'Tecnología', slug: 'tecnologia' },
  { name: 'Ropa', slug: 'ropa' },
  { name: 'Calzado', slug: 'calzado' },
  { name: 'Hogar', slug: 'hogar' },
  { name: 'Accesorios', slug: 'accesorios' },
  { name: 'Belleza', slug: 'belleza' },
  { name: 'Alimentos', slug: 'alimentos' },
  { name: 'Deportes', slug: 'deportes' },
];

async function main(): Promise<void> {
  const prisma = createDatabaseClient();
  try {
    await prisma.$transaction(
      categories.map((category) =>
        prisma.category.upsert({
          where: { slug: category.slug },
          create: category,
          update: { name: category.name },
        }),
      ),
    );
    process.stdout.write('Seed OK: ocho categorías globales, sin duplicados ni credenciales.\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  process.stderr.write('No se pudo ejecutar el seed. Revisa la conexión y las migraciones.\n');
  process.exitCode = 1;
});
