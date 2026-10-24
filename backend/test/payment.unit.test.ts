import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LocalPaymentService } from '../src/checkout/payment.service';
import type { PaymentMethod } from '../src/generated/prisma/client';
const payments = new LocalPaymentService();
test('preparar nunca cobra ni marca pagado, incluso en simulación', () => {
  for (const method of ['CASH_ON_DELIVERY', 'SIMULATED'] as const) {
    const result = payments.prepare(method, '0.10');
    assert.equal(result.amount, '0.10');
    assert.equal(result.status, 'PENDING');
    assert.equal(result.currency, 'GTQ');
    assert.equal(result.requiresOnlinePayment, false);
    assert.equal(result.simulation, method === 'SIMULATED');
  }
});
test('decimales de pago conservan centavos y el límite monetario del pedido', () => {
  assert.equal(payments.prepare('CASH_ON_DELIVERY', '999999999999.99').amount, '999999999999.99');
  assert.equal(payments.prepare('SIMULATED', '10.1').amount, '10.10');
});
test('solo la finalización simulada marca PAID y un método ajeno se rechaza', () => {
  assert.equal(payments.complete('CASH_ON_DELIVERY', '10.10'), 'PENDING');
  assert.equal(payments.complete('SIMULATED', '10.10'), 'PAID');
  assert.throws(() => payments.complete('EXTERNAL' as PaymentMethod, '10.10'), { status: 400 });
});
