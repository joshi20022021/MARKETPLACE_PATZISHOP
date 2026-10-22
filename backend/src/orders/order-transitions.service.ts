import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { PublicUser } from '../users/public-user';
import { lockOrderRows } from './order-locks';
import { nextOrderStatuses } from './order-status.policy';
import { ChangeSellerOrderStatusDto } from './dto/order-input.dto';
import { SELLER_ORDER_SELECT, sellerOrderResponse } from './order-projection';
@Injectable()
export class OrderTransitionsService {
  constructor(private readonly prisma: PrismaService) {}
  private conflict(error: string, message: string): never {
    throw new ConflictException({ error, message });
  }
  async change(user: PublicUser, id: string, input: ChangeSellerOrderStatusDto) {
    if (
      !['SELLER', 'CUSTOMER'].includes(user.role) ||
      (user.role === 'CUSTOMER' && input.status !== 'CANCELLED')
    )
      throw new ForbiddenException({
        error: 'ROLE_FORBIDDEN',
        message: 'No tienes permiso para esta operación',
      });
    const role = user.role as 'SELLER' | 'CUSTOMER';
    const scope: Prisma.SellerOrderWhereInput =
      role === 'SELLER' ? { business: { ownerId: user.id } } : { order: { customerId: user.id } };
    const missing = () =>
      new NotFoundException({ error: 'RESOURCE_NOT_FOUND', message: 'Recurso no encontrado' });
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const initial = await tx.sellerOrder.findFirst({
            where: { id, AND: scope },
            select: {
              businessId: true,
              business: { select: { ownerId: true } },
              items: { select: { productId: true, quantity: true } },
            },
          });
          if (!initial) throw missing();
          // Same order as checkout/product writes: all products, business, categories, users, then suborder.
          await lockOrderRows(
            tx,
            'Product',
            initial.items.map((item) => item.productId),
          );
          const products = await tx.product.findMany({
            where: { id: { in: initial.items.map((item) => item.productId) } },
            select: { id: true, businessId: true, categoryId: true, stock: true, status: true },
          });
          await lockOrderRows(tx, 'Business', [initial.businessId]);
          await lockOrderRows(
            tx,
            'Category',
            products.map((product) => product.categoryId),
          );
          await lockOrderRows(tx, 'User', [initial.business.ownerId, user.id]);
          await tx.$queryRaw`SELECT id FROM "SellerOrder" WHERE id=${id}::uuid FOR UPDATE`;
          const current = await tx.sellerOrder.findFirst({
            where: { id, AND: scope },
            include: {
              statusHistory: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 },
            },
          });
          if (!current) throw missing();
          const actor = await tx.user.findUnique({
            where: { id: user.id },
            select: { role: true, isActive: true },
          });
          if (!actor?.isActive || actor.role !== role)
            throw new ForbiddenException({
              error: 'ROLE_FORBIDDEN',
              message: 'Tu cuenta no permite cambiar pedidos',
            });
          const last = current.statusHistory[0];
          const note = input.note || null;
          if (current.status !== input.expectedStatus) {
            if (
              current.status === input.status &&
              last?.actorId === user.id &&
              last.fromStatus === input.expectedStatus &&
              last.toStatus === input.status &&
              last.note === note
            )
              return sellerOrderResponse(
                await tx.sellerOrder.findUniqueOrThrow({
                  where: { id },
                  select: SELLER_ORDER_SELECT,
                }),
              );
            this.conflict(
              'ORDER_STATE_CHANGED',
              'El estado cambió. Consulta el pedido antes de continuar',
            );
          }
          if (!nextOrderStatuses(current.status, role).includes(input.status))
            this.conflict('ORDER_TRANSITION_INVALID', 'Esta transición no está permitida');
          const confirming = input.status === 'CONFIRMED';
          const cancelling = input.status === 'CANCELLED';
          if (
            current.stockRestoredAt ||
            (confirming && current.stockDeductedAt) ||
            (!current.stockDeductedAt && current.status !== 'PENDING')
          )
            this.conflict('ORDER_INVENTORY_INVALID', 'El inventario del pedido necesita revisión');
          const changes: Prisma.SellerOrderUpdateInput = { status: input.status };
          const at = new Date(
            Math.max(
              Date.now(),
              (last?.createdAt.getTime() ?? 0) + 1,
              current.stockDeductedAt?.getTime() ?? 0,
            ),
          );
          if (confirming || (cancelling && current.stockDeductedAt)) {
            if (
              !initial.items.length ||
              products.length !== initial.items.length ||
              initial.items.some((item) => item.quantity < 1)
            )
              this.conflict(
                'ORDER_INVENTORY_INVALID',
                'El inventario del pedido necesita revisión',
              );
            const business = await tx.business.findUniqueOrThrow({
              where: { id: initial.businessId },
              select: { status: true, owner: { select: { isActive: true, role: true } } },
            });
            const cats = await tx.category.findMany({
              where: { id: { in: products.map((p) => p.categoryId) } },
              select: { id: true, isActive: true },
            });
            const activeCats = new Set(cats.filter((c) => c.isActive).map((c) => c.id));
            for (const item of initial.items) {
              const product = products.find((p) => p.id === item.productId)!;
              const publishable =
                business.status === 'ACTIVE' &&
                business.owner.isActive &&
                business.owner.role === 'SELLER' &&
                activeCats.has(product.categoryId);
              if (
                confirming &&
                (!publishable || product.status !== 'ACTIVE' || product.stock < item.quantity)
              )
                this.conflict(
                  'ORDER_STOCK_UNAVAILABLE',
                  'No hay disponibilidad para confirmar este subpedido',
                );
              const next = product.stock + (confirming ? -item.quantity : item.quantity);
              if (next > 2147483647)
                this.conflict('ORDER_STOCK_LIMIT', 'La devolución supera el límite de existencias');
              await tx.product.update({
                where: { id: product.id, businessId: initial.businessId },
                data: {
                  stock: next,
                  status: confirming
                    ? next === 0
                      ? 'OUT_OF_STOCK'
                      : 'ACTIVE'
                    : product.status === 'INACTIVE' || !publishable
                      ? 'INACTIVE'
                      : 'ACTIVE',
                },
              });
              await tx.inventoryMovement.create({
                data: {
                  productId: product.id,
                  businessId: initial.businessId,
                  sellerOrderId: id,
                  type: confirming ? 'OUT' : 'IN',
                  quantity: confirming ? -item.quantity : item.quantity,
                  previousStock: product.stock,
                  newStock: next,
                  reason: confirming
                    ? 'Confirmación de subpedido pendiente'
                    : 'Cancelación de subpedido',
                },
              });
            }
            if (confirming) changes.stockDeductedAt = at;
            else changes.stockRestoredAt = at;
          }
          await tx.sellerOrder.update({ where: { id, AND: scope }, data: changes });
          await tx.orderStatusHistory.create({
            data: {
              sellerOrderId: id,
              actorId: user.id,
              fromStatus: current.status,
              toStatus: input.status,
              note,
              createdAt: at,
            },
          });
          return sellerOrderResponse(
            await tx.sellerOrder.findUniqueOrThrow({ where: { id }, select: SELLER_ORDER_SELECT }),
          );
        },
        { timeout: 10000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2028'].includes(error.code)
      )
        this.conflict(
          'ORDER_STATE_BUSY',
          'La operación está ocupada. Consulta el pedido antes de repetirla',
        );
      throw error;
    }
  }
}
