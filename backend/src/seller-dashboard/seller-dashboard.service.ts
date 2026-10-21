import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ResourceScopeService } from '../security/resource-scope.service';
import type { PublicUser } from '../users/public-user';
import type { SellerDashboardResponse } from './seller-dashboard.dto';
@Injectable()
export class SellerDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopes: ResourceScopeService,
  ) {}
  async summary(user: PublicUser): Promise<SellerDashboardResponse> {
    const scope = this.scopes.sellerBusiness(user);
    return this.prisma.$transaction(
      async (tx) => {
        const business = await tx.business.findFirst({
          where: scope,
          select: { id: true, name: true, slug: true, status: true },
        });
        const products = { total: 0, active: 0, inactive: 0, outOfStock: 0, lowStock: 0 };
        const orders = {
          total: 0,
          open: 0,
          delivered: 0,
          cancelled: 0,
          cashOnDeliveryTotal: '0.00',
          simulatedTotal: '0.00',
          currency: 'GTQ' as const,
        };
        if (!business) return { business: null, products, orders };
        const productStates = await tx.product.groupBy({
          by: ['status'],
          where: { businessId: business.id },
          _count: { _all: true },
        });
        for (const row of productStates) {
          products.total += row._count._all;
          if (row.status === 'ACTIVE') products.active = row._count._all;
          else if (row.status === 'INACTIVE') products.inactive = row._count._all;
          else products.outOfStock = row._count._all;
        }
        products.lowStock = await tx.product.count({
          where: { businessId: business.id, stock: { gte: 1, lte: 5 } },
        });
        const states = await tx.sellerOrder.groupBy({
          by: ['status'],
          where: { businessId: business.id },
          _count: { _all: true },
        });
        for (const row of states) {
          orders.total += row._count._all;
          if (row.status === 'CANCELLED') orders.cancelled += row._count._all;
          else if (row.status === 'DELIVERED') orders.delivered += row._count._all;
          else orders.open += row._count._all;
        }
        for (const method of ['CASH_ON_DELIVERY', 'SIMULATED'] as const) {
          const amount = await tx.sellerOrder.aggregate({
            where: {
              businessId: business.id,
              status: { not: 'CANCELLED' },
              order: { paymentMethod: method },
            },
            _sum: { subtotal: true },
          });
          const total = amount._sum.subtotal?.toFixed(2) ?? '0.00';
          if (method === 'SIMULATED') orders.simulatedTotal = total;
          else orders.cashOnDeliveryTotal = total;
        }
        return { business, products, orders };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
}
