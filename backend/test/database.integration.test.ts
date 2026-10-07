import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createDatabaseClient } from '../src/config/database';
import type { Prisma } from '../src/generated/prisma/client';
import { createOrderFixture, orderItemData } from './database-fixtures';

const prisma = createDatabaseClient();
const rollback = new Error('ROLLBACK_TEST_DATA');
after(async () => prisma.$disconnect());

async function isolated(run: (tx: Prisma.TransactionClient) => Promise<void>): Promise<void> {
  try {
    await prisma.$transaction(
      async (tx) => {
        await run(tx);
        throw rollback;
      },
      { timeout: 30000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

function hasCode(expected: string) {
  return (error: unknown): boolean =>
    typeof error === 'object' && error !== null && 'code' in error && error.code === expected;
}

function violatesCheck(name: string) {
  return (error: unknown): boolean =>
    error instanceof Error && error.message.includes('23514') && error.message.includes(name);
}

test('la compra conserva subpedidos por vendedor, decimales y snapshots', async () => {
  await isolated(async (tx) => {
    const f = await createOrderFixture(tx);
    const item = await tx.orderItem.create({ data: orderItemData(f) });
    await tx.orderItem.create({
      data: {
        ...orderItemData(f),
        sellerOrderId: f.otherSellerOrder.id,
        productId: f.otherProduct.id,
        businessId: f.otherProduct.businessId,
        productName: f.otherProduct.name,
      },
    });
    await tx.product.update({
      where: { id: f.firstProduct.id },
      data: { name: 'Nombre modificado', price: '12.00' },
    });
    const stored = await tx.orderItem.findUniqueOrThrow({ where: { id: item.id } });
    const order = await tx.order.findUniqueOrThrow({
      where: { id: f.order.id },
      include: { sellerOrders: { include: { items: true } } },
    });
    assert.equal(stored.productName, f.firstProduct.name);
    assert.equal(stored.unitPrice.toFixed(2), '10.10');
    assert.equal(stored.lineTotal.toFixed(2), '20.20');
    assert.equal(order.sellerOrders.length, 2);
    assert(order.sellerOrders.every((suborder) => suborder.items.length === 1));
    assert.equal(order.total.toFixed(2), '40.40');
  });
});

test('rechaza productos de otra tienda dentro de un subpedido', async () => {
  await isolated(async (tx) => {
    const f = await createOrderFixture(tx);
    await assert.rejects(
      tx.orderItem.create({ data: { ...orderItemData(f), productId: f.otherProduct.id } }),
      hasCode('P2003'),
    );
  });
});

test('rechaza asociar un movimiento a un subpedido de otra tienda', async () => {
  await isolated(async (tx) => {
    const f = await createOrderFixture(tx);
    await assert.rejects(
      tx.inventoryMovement.create({
        data: {
          productId: f.firstProduct.id,
          businessId: f.firstProduct.businessId,
          sellerOrderId: f.otherSellerOrder.id,
          type: 'OUT',
          quantity: -1,
          previousStock: 5,
          newStock: 4,
          reason: 'Prueba',
        },
      }),
      hasCode('P2003'),
    );
  });
});

test('rechaza stock negativo', async () => {
  await isolated(async (tx) => {
    const f = await createOrderFixture(tx);
    await assert.rejects(
      tx.product.update({ where: { id: f.firstProduct.id }, data: { stock: -1 } }),
      violatesCheck('Product_stock_nonnegative_check'),
    );
  });
});

test('rechaza precio negativo', async () => {
  await isolated(async (tx) => {
    const f = await createOrderFixture(tx);
    await assert.rejects(
      tx.product.update({ where: { id: f.firstProduct.id }, data: { price: '-0.01' } }),
      violatesCheck('Product_price_nonnegative_check'),
    );
  });
});

test('rechaza cantidad cero en carrito', async () => {
  await isolated(async (tx) => {
    const f = await createOrderFixture(tx);
    const cart = await tx.cart.create({ data: { userId: f.customer.id } });
    await assert.rejects(
      tx.cartItem.create({ data: { cartId: cart.id, productId: f.firstProduct.id, quantity: 0 } }),
      violatesCheck('CartItem_quantity_positive_check'),
    );
  });
});

test('rechaza un total de línea manipulado', async () => {
  await isolated(async (tx) => {
    const f = await createOrderFixture(tx);
    await assert.rejects(
      tx.orderItem.create({ data: { ...orderItemData(f), lineTotal: '0.01' } }),
      violatesCheck('OrderItem_lineTotal_consistent_check'),
    );
  });
});

test('SKU se puede repetir entre tiendas, pero no dentro de una tienda', async () => {
  await isolated(async (tx) => {
    const f = await createOrderFixture(tx);
    assert.equal(f.firstProduct.sku, f.otherProduct.sku);
    await assert.rejects(
      tx.product.create({
        data: {
          businessId: f.firstProduct.businessId,
          categoryId: f.category.id,
          name: 'Duplicado',
          slug: `duplicate-${f.firstProduct.id}`,
          description: '',
          price: '1.00',
          sku: f.firstProduct.sku,
        },
      }),
      hasCode('P2002'),
    );
  });
});

test('no permite borrar un producto usado en un pedido', async () => {
  await isolated(async (tx) => {
    const f = await createOrderFixture(tx);
    await tx.orderItem.create({ data: orderItemData(f) });
    await assert.rejects(tx.product.delete({ where: { id: f.firstProduct.id } }), hasCode('P2003'));
  });
});

test('rechaza movimientos con saldo inconsistente', async () => {
  await isolated(async (tx) => {
    const f = await createOrderFixture(tx);
    await assert.rejects(
      tx.inventoryMovement.create({
        data: {
          productId: f.firstProduct.id,
          businessId: f.firstProduct.businessId,
          type: 'OUT',
          quantity: -2,
          previousStock: 5,
          newStock: 4,
          reason: 'Prueba',
        },
      }),
      violatesCheck('InventoryMovement_balance_check'),
    );
  });
});
