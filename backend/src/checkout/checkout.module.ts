import { Module } from '@nestjs/common';
import { CartsModule } from '../carts/carts.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { LocalPaymentService, PaymentService } from './payment.service';
@Module({
  imports: [CartsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, { provide: PaymentService, useClass: LocalPaymentService }],
})
export class CheckoutModule {}
