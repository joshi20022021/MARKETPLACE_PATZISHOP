import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CartsService } from '../carts/carts.service';
import { lockCustomerCart } from '../carts/cart-lock';
import { deliverySnapshot, digest, reviewVersion } from '../checkout/review-version';
import { PaymentService } from '../checkout/payment.service';
import type { PublicUser } from '../users/public-user';
import { ConfirmOrderDto, ListOrdersDto } from './dto/order-input.dto';
import {
  OrderListResponse,
  OrderResponse,
  SellerOrderDetail,
  SellerOrderListResponse,
} from './dto/order-response.dto';
import {
  ORDER_SELECT,
  SELLER_ORDER_SELECT,
  orderResponse,
  sellerOrderResponse,
} from './order-projection';
import { lockOrderRows } from './order-locks';
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carts: CartsService,
    private readonly payments: PaymentService,
  ) {}
  private role(user: PublicUser, role: 'CUSTOMER' | 'SELLER') {
    if (user.role !== role)
      throw new ForbiddenException({
        error: 'ROLE_FORBIDDEN',
        message: 'No tienes permiso para esta operación',
      });
  }
  private found<T>(value: T | null): T {
    if (!value)
      throw new NotFoundException({
        error: 'RESOURCE_NOT_FOUND',
        message: 'Recurso no encontrado',
      });
    return value;
  }
  async confirm(user: PublicUser, input: ConfirmOrderDto): Promise<OrderResponse> {
    this.role(user, 'CUSTOMER');
    const requestHash = digest({
      delivery: deliverySnapshot(input.delivery),
      paymentMethod: input.paymentMethod,
      reviewVersion: input.reviewVersion,
    });
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await lockCustomerCart(tx, user.id);
          const existing = await tx.order.findFirst({
            where: { customerId: user.id, idempotencyKey: input.idempotencyKey },
            select: { id: true, requestHash: true },
          });
          if (existing) {
            if (existing.requestHash !== requestHash)
              throw new ConflictException({
                error: 'IDEMPOTENCY_KEY_REUSED',
                message: 'Este intento corresponde a otra confirmación',
              });
            return orderResponse(
              this.found(
                await tx.order.findFirst({
                  where: { id: existing.id, customerId: user.id },
                  select: ORDER_SELECT,
                }),
              ),
            );
          }
          const lines = await tx.cartItem.findMany({
            where: { cart: { userId: user.id } },
            select: { productId: true, quantity: true },
          });
          if (!lines.length)
            throw new ConflictException({ error: 'EMPTY_CART', message: 'Tu carrito está vacío' });
          if (lines.length > 50 || lines.some((line) => line.quantity < 1 || line.quantity > 99))
            throw new ConflictException({
              error: 'CART_NEEDS_ATTENTION',
              message: 'Revisa las cantidades del carrito',
            });
          await lockOrderRows(
            tx,
            'Product',
            lines.map((line) => line.productId),
          );
          const products = await tx.product.findMany({
            where: { id: { in: lines.map((line) => line.productId) } },
            select: {
              id: true,
              sku: true,
              categoryId: true,
              businessId: true,
              business: { select: { ownerId: true } },
            },
          });
          await lockOrderRows(
            tx,
            'Business',
            products.map((product) => product.businessId),
          );
          await lockOrderRows(
            tx,
            'Category',
            products.map((product) => product.categoryId),
          );
          await lockOrderRows(tx, 'User', [
            ...products.map((product) => product.business.ownerId),
            user.id,
          ]);
          const customer = await tx.user.findUnique({
            where: { id: user.id },
            select: { role: true, isActive: true },
          });
          if (!customer?.isActive || customer.role !== 'CUSTOMER')
            throw new ForbiddenException({
              error: 'ROLE_FORBIDDEN',
              message: 'Tu cuenta no permite confirmar pedidos',
            });
          const cart = await this.carts.snapshot(tx, user.id);
          if (cart.hasIssues || products.length !== lines.length)
            throw new ConflictException({
              error: 'CART_NEEDS_ATTENTION',
              message: 'La disponibilidad cambió. Revisa tu carrito',
            });
          if (reviewVersion(user.id, input, cart) !== input.reviewVersion)
            throw new ConflictException({
              error: 'CHECKOUT_CHANGED',
              message: 'Tus productos o datos cambiaron. Revisa de nuevo antes de confirmar',
            });
          if (new Prisma.Decimal(cart.total).gt('999999999999.99'))
            throw new ConflictException({
              error: 'ORDER_TOTAL_LIMIT',
              message: 'El total supera el límite de un pedido',
            });
          const order = await tx.order.create({
            data: {
              customerId: user.id,
              ...deliverySnapshot(input.delivery),
              total: cart.total,
              paymentMethod: input.paymentMethod,
              idempotencyKey: input.idempotencyKey,
              requestHash,
            },
            select: { id: true },
          });
          const byId = new Map(products.map((product) => [product.id, product]));
          for (const group of cart.groups) {
            const business = this.found(group.business);
            const sellerOrder = await tx.sellerOrder.create({
              data: {
                orderId: order.id,
                businessId: business.id,
                subtotal: group.subtotal,
                status: 'CONFIRMED',
                stockDeductedAt: new Date(),
                statusHistory: {
                  create: {
                    actorId: user.id,
                    toStatus: 'CONFIRMED',
                    note: 'Compra confirmada por el cliente',
                  },
                },
              },
              select: { id: true },
            });
            for (const item of group.items) {
              const product = this.found(item.product);
              await tx.orderItem.create({
                data: {
                  sellerOrderId: sellerOrder.id,
                  businessId: business.id,
                  productId: product.id,
                  productName: product.name,
                  sku: this.found(byId.get(product.id) ?? null).sku,
                  unitPrice: product.price,
                  quantity: item.quantity,
                  lineTotal: this.found(item.lineTotal),
                },
              });
              const current = await tx.product.findUniqueOrThrow({
                where: { id: product.id },
                select: { stock: true },
              });
              const next = current.stock - item.quantity;
              await tx.product.update({
                where: { id: product.id },
                data: { stock: next, status: next === 0 ? 'OUT_OF_STOCK' : 'ACTIVE' },
              });
              await tx.inventoryMovement.create({
                data: {
                  productId: product.id,
                  businessId: business.id,
                  sellerOrderId: sellerOrder.id,
                  type: 'OUT',
                  quantity: -item.quantity,
                  previousStock: current.stock,
                  newStock: next,
                  reason: 'Compra confirmada',
                },
              });
            }
          }
          const paymentStatus = this.payments.complete(input.paymentMethod, cart.total);
          await tx.order.update({ where: { id: order.id }, data: { paymentStatus } });
          await tx.cartItem.deleteMany({ where: { cart: { userId: user.id } } });
          return orderResponse(
            await tx.order.findUniqueOrThrow({ where: { id: order.id }, select: ORDER_SELECT }),
          );
        },
        { timeout: 10000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2028'].includes(error.code)
      )
        throw new ConflictException({
          error: 'CHECKOUT_BUSY',
          message: 'La confirmación está ocupada. Comprueba tu intento antes de repetirlo',
        });
      throw error;
    }
  }
  async byId(user: PublicUser, id: string): Promise<OrderResponse> {
    this.role(user, 'CUSTOMER');
    return orderResponse(
      this.found(
        await this.prisma.order.findFirst({
          where: { id, customerId: user.id },
          select: ORDER_SELECT,
        }),
      ),
    );
  }
  async byConfirmation(user: PublicUser, key: string): Promise<OrderResponse> {
    this.role(user, 'CUSTOMER');
    return this.prisma.$transaction(async (tx) => {
      await lockCustomerCart(tx, user.id);
      return orderResponse(
        this.found(
          await tx.order.findFirst({
            where: { customerId: user.id, idempotencyKey: key },
            select: ORDER_SELECT,
          }),
        ),
      );
    });
  }
  async list(user: PublicUser, query: ListOrdersDto): Promise<OrderListResponse> {
    this.role(user, 'CUSTOMER');
    return this.prisma.$transaction(
      async (tx) => {
        const where = { customerId: user.id };
        const total = await tx.order.count({ where });
        const rows = await tx.order.findMany({
          where,
          select: ORDER_SELECT,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        });
        return {
          data: rows.map(orderResponse),
          meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
          },
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async sellerById(user: PublicUser, id: string): Promise<SellerOrderDetail> {
    this.role(user, 'SELLER');
    return sellerOrderResponse(
      this.found(
        await this.prisma.sellerOrder.findFirst({
          where: { id, business: { ownerId: user.id } },
          select: SELLER_ORDER_SELECT,
        }),
      ),
    );
  }
  async sellerList(user: PublicUser, query: ListOrdersDto): Promise<SellerOrderListResponse> {
    this.role(user, 'SELLER');
    return this.prisma.$transaction(
      async (tx) => {
        const where = { business: { ownerId: user.id } };
        const total = await tx.sellerOrder.count({ where });
        const rows = await tx.sellerOrder.findMany({
          where,
          select: SELLER_ORDER_SELECT,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        });
        return {
          data: rows.map(sellerOrderResponse),
          meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
          },
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
}
