import type { PrismaClient } from '../src/generated/prisma/client';

export const BASE_CATEGORIES = [
  { name: 'Tecnología', slug: 'tecnologia' },
  { name: 'Ropa', slug: 'ropa' },
  { name: 'Calzado', slug: 'calzado' },
  { name: 'Hogar', slug: 'hogar' },
  { name: 'Accesorios', slug: 'accesorios' },
  { name: 'Belleza', slug: 'belleza' },
  { name: 'Alimentos', slug: 'alimentos' },
  { name: 'Deportes', slug: 'deportes' },
] as const;

/** Populate missing slugs; preserve all administrator edits to existing records. */
export async function seedCategories(
  prisma: PrismaClient,
  categories: readonly { name: string; slug: string }[] = BASE_CATEGORIES,
): Promise<void> {
  await prisma.$transaction(
    categories.map((category) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        create: category,
        update: {},
      }),
    ),
  );
}
