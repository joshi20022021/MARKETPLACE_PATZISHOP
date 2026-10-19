import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { CartsService } from '../carts/carts.service';
import type { PublicUser } from '../users/public-user';
import { PaymentService } from './payment.service';
import { CheckoutPreviewDto } from './dto/checkout-input.dto';
import { CheckoutOptions, CheckoutPreview } from './dto/checkout-response.dto';
import { reviewVersion } from './review-version';
@Injectable()
export class CheckoutService {
  constructor(
    private readonly carts: CartsService,
    private readonly payments: PaymentService,
  ) {}
  private customer(user: PublicUser) {
    if (user.role !== 'CUSTOMER')
      throw new ForbiddenException({
        error: 'ROLE_FORBIDDEN',
        message: 'El checkout es para clientes',
      });
  }
  options(user: PublicUser): CheckoutOptions {
    this.customer(user);
    return {
      paymentMethods: this.payments.options(),
      countryCode: 'GT',
      currency: 'GTQ',
      canPlaceOrder: true,
    };
  }
  async preview(user: PublicUser, input: CheckoutPreviewDto): Promise<CheckoutPreview> {
    this.customer(user);
    const cart = await this.carts.read(user);
    if (!cart.itemCount)
      throw new ConflictException({
        error: 'EMPTY_CART',
        message: 'Agrega productos antes de revisar la entrega',
      });
    if (cart.hasIssues)
      throw new ConflictException({
        error: 'CART_NEEDS_ATTENTION',
        message: 'Revisa la disponibilidad y cantidades de tu carrito',
      });
    return {
      stage: 'REVIEW_ONLY',
      canPlaceOrder: true,
      reviewVersion: reviewVersion(user.id, input, cart),
      delivery: input.delivery,
      cart,
      payment: this.payments.prepare(input.paymentMethod, cart.total),
      shippingTotal: null,
    };
  }
}
