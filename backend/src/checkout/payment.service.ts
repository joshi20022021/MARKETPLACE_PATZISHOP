import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma } from '../generated/prisma/client';
import { PaymentOption, PaymentPreparation } from './dto/checkout-response.dto';
/** Preparation describes a payment; no charge, paid status or external intent is created. */
export abstract class PaymentService {
  abstract options(): PaymentOption[];
  abstract prepare(method: PaymentMethod, amount: string): PaymentPreparation;
  abstract complete(method: PaymentMethod, amount: string): 'PENDING' | 'PAID';
}
@Injectable()
export class LocalPaymentService extends PaymentService {
  complete(method: PaymentMethod, amount: string): 'PENDING' | 'PAID' {
    this.prepare(method, amount);
    return method === 'SIMULATED' ? 'PAID' : 'PENDING';
  }
  options(): PaymentOption[] {
    return [
      {
        method: 'CASH_ON_DELIVERY',
        label: 'Pago contra entrega',
        description: 'Pagas al recibir tus productos. Esta revisión no registra un cobro.',
        simulation: false,
      },
      {
        method: 'SIMULATED',
        label: 'Pago simulado (prueba)',
        description: 'Solo para pruebas. No se cobra dinero ni se solicitan datos de tarjeta.',
        simulation: true,
      },
    ];
  }
  prepare(method: PaymentMethod, amount: string): PaymentPreparation {
    const option = this.options().find((value) => value.method === method);
    if (!option)
      throw new BadRequestException({
        error: 'INVALID_PAYMENT_METHOD',
        message: 'Selecciona un método de pago válido',
      });
    return {
      ...option,
      status: 'PENDING',
      currency: 'GTQ',
      amount: new Prisma.Decimal(amount).toFixed(2),
      requiresOnlinePayment: false,
    };
  }
}
