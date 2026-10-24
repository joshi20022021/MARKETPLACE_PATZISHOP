import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextOrderStatuses } from '../src/orders/order-status.policy';
import type { OrderStatus } from '../src/generated/prisma/client';
test('vendedor solo puede avanzar o cancelar antes del envío, sin reapertura', () => {
  const cases: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  };
  for (const [state, allowed] of Object.entries(cases))
    assert.deepEqual(nextOrderStatuses(state as OrderStatus, 'SELLER'), allowed);
});
test('cliente pierde cancelación al comenzar preparación y nunca cambia estados operativos', () => {
  for (const status of ['PENDING', 'CONFIRMED'] as const)
    assert.deepEqual(nextOrderStatuses(status, 'CUSTOMER'), ['CANCELLED']);
  for (const status of ['PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const)
    assert.deepEqual(nextOrderStatuses(status, 'CUSTOMER'), []);
});
test('un consumidor no puede alterar la política al modificar las capacidades recibidas', () => {
  nextOrderStatuses('CONFIRMED', 'SELLER').push('DELIVERED');
  assert.deepEqual(nextOrderStatuses('CONFIRMED', 'SELLER'), ['PREPARING', 'CANCELLED']);
});
