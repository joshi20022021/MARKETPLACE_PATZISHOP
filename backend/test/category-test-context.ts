import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { businessContext } from './business-test-context';

export async function categoryContext() {
  const context = await businessContext();
  const slugs: string[] = [];
  const productIds: string[] = [];
  function input(overrides: Record<string, unknown> = {}) {
    const slug = `cat-${randomUUID()}`;
    slugs.push(slug);
    return { name: ' Categoría prueba ', slug, description: ' Descripción prueba ', ...overrides };
  }
  async function close() {
    try {
      await context.prisma.product.deleteMany({ where: { id: { in: productIds } } });
      await context.prisma.category.deleteMany({ where: { slug: { in: slugs } } });
      assert.equal(await context.prisma.category.count({ where: { slug: { in: slugs } } }), 0);
    } finally {
      await context.close();
    }
  }
  return { ...context, slugs, productIds, input, close };
}
