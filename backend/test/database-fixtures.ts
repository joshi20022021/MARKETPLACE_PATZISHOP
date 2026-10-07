import { randomUUID } from 'node:crypto';
import type { Prisma } from '../src/generated/prisma/client';

export async function createOrderFixture(tx: Prisma.TransactionClient) {
  const suffix = randomUUID();
  const customer = await tx.user.create({
    data: {
      email: `customer-${suffix}@example.test`,
      name: 'Cliente de prueba',
      passwordHash: 'TEST_ONLY_NOT_A_LOGIN_HASH',
    },
  });
  const category = await tx.category.create({ data: { name: 'Prueba', slug: `test-${suffix}` } });
  const businesses = [];
  const products = [];
  for (const index of [0, 1]) {
    const owner = await tx.user.create({
      data: {
        email: `seller-${index}-${suffix}@example.test`,
        name: 'Vendedor de prueba',
        passwordHash: 'TEST_ONLY_NOT_A_LOGIN_HASH',
        role: 'SELLER',
      },
    });
    const business = await tx.business.create({
      data: {
        ownerId: owner.id,
        name: `Tienda ${index}`,
        slug: `store-${index}-${suffix}`,
        email: owner.email,
        phone: '55550000',
        address: 'Dirección de prueba',
        status: 'ACTIVE',
      },
    });
    const product = await tx.product.create({
      data: {
        businessId: business.id,
        categoryId: category.id,
        name: `Producto ${index}`,
        slug: `product-${index}-${suffix}`,
        description: 'Prueba de restricciones',
        price: '10.10',
        stock: 5,
        sku: 'SKU-TEST',
        status: 'ACTIVE',
      },
    });
    businesses.push(business);
    products.push(product);
  }
  const order = await tx.order.create({
    data: {
      customerId: customer.id,
      total: '40.40',
      paymentMethod: 'CASH_ON_DELIVERY',
      recipientName: customer.name,
      phone: '55550000',
      addressLine: 'Dirección copiada',
      city: 'Patzicía',
      region: 'Chimaltenango',
    },
  });
  const sellerOrders = [];
  for (const business of businesses) {
    sellerOrders.push(
      await tx.sellerOrder.create({
        data: { orderId: order.id, businessId: business.id, subtotal: '20.20' },
      }),
    );
  }
  const firstProduct = products[0];
  const otherProduct = products[1];
  const firstSellerOrder = sellerOrders[0];
  const otherSellerOrder = sellerOrders[1];
  if (!firstProduct || !otherProduct || !firstSellerOrder || !otherSellerOrder)
    throw new Error('Fixture incompleto.');
  return {
    customer,
    category,
    order,
    firstProduct,
    otherProduct,
    firstSellerOrder,
    otherSellerOrder,
  };
}

export function orderItemData(fixture: Awaited<ReturnType<typeof createOrderFixture>>) {
  return {
    sellerOrderId: fixture.firstSellerOrder.id,
    businessId: fixture.firstProduct.businessId,
    productId: fixture.firstProduct.id,
    productName: fixture.firstProduct.name,
    sku: fixture.firstProduct.sku,
    unitPrice: '10.10',
    quantity: 2,
    lineTotal: '20.20',
  };
}
