import { randomUUID } from 'node:crypto';
import { categoryContext } from './category-test-context';
import { businessInput } from './business-test-context';

export async function productContext() {
  const context = await categoryContext();
  const seller = await context.identity();
  const other = await context.identity();
  const business = await context.prisma.business.create({
    data: { ...businessInput(), ownerId: seller.user.id, status: 'ACTIVE' },
  });
  const otherBusiness = await context.prisma.business.create({
    data: { ...businessInput(), ownerId: other.user.id, status: 'ACTIVE' },
  });
  const category = await context.prisma.category.create({ data: context.input() });
  const orderIds: string[] = [];
  const input = (overrides: Record<string, unknown> = {}) => ({
    categoryId: category.id,
    name: ' Producto de prueba ',
    slug: `product-${randomUUID()}`,
    description: ' Descripción ',
    price: '10.10',
    sku: randomUUID(),
    stock: 3,
    ...overrides,
  });
  async function close() {
    try {
      await context.prisma.orderItem.deleteMany({
        where: { productId: { in: context.productIds } },
      });
      await context.prisma.inventoryMovement.deleteMany({
        where: { productId: { in: context.productIds } },
      });
      await context.prisma.sellerOrder.deleteMany({ where: { orderId: { in: orderIds } } });
      await context.prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    } finally {
      await context.close();
    }
  }
  return {
    ...context,
    seller,
    other,
    business,
    otherBusiness,
    category,
    orderIds,
    productInput: input,
    close,
  };
}
