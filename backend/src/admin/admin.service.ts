import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, type BusinessStatus } from '../generated/prisma/client';
import type { PublicUser } from '../users/public-user';
import { SELLER_BUSINESS_SELECT } from '../businesses/dto/business-response.dto';
import { PUBLIC_PRODUCT_SCOPE } from '../products/public-product-scope';
import {
  AdminListBusinessesDto,
  ChangeBusinessStatusDto,
  type AdminDashboardResponse,
} from './admin.dto';

const select = {
  ...SELLER_BUSINESS_SELECT,
  owner: { select: { name: true, role: true, isActive: true } },
} as const;
const transitions: Record<BusinessStatus, BusinessStatus[]> = {
  PENDING: ['ACTIVE', 'REJECTED'],
  ACTIVE: ['SUSPENDED'],
  SUSPENDED: ['ACTIVE'],
  REJECTED: ['PENDING'],
};
function project(business: Prisma.BusinessGetPayload<{ select: typeof select }>) {
  return {
    ...business,
    allowedStatuses: transitions[business.status].filter(
      (state) =>
        state !== 'ACTIVE' || (business.owner.isActive && business.owner.role === 'SELLER'),
    ),
  };
}
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}
  private authorize(user: PublicUser) {
    if (user.role !== 'ADMIN')
      throw new ForbiddenException('Se requiere una cuenta administradora');
  }
  async summary(user: PublicUser): Promise<AdminDashboardResponse> {
    this.authorize(user);
    return this.prisma.$transaction(
      async (tx) => {
        const users = { total: 0, active: 0, admins: 0, sellers: 0, customers: 0 };
        for (const row of await tx.user.groupBy({
          by: ['role', 'isActive'],
          _count: { _all: true },
        })) {
          const count = row._count._all;
          users.total += count;
          if (row.isActive) users.active += count;
          if (row.role === 'ADMIN') users.admins += count;
          else if (row.role === 'SELLER') users.sellers += count;
          else users.customers += count;
        }
        const businesses = { total: 0, pending: 0, active: 0, suspended: 0, rejected: 0 };
        for (const row of await tx.business.groupBy({ by: ['status'], _count: { _all: true } })) {
          const count = row._count._all;
          businesses.total += count;
          const key = {
            PENDING: 'pending',
            ACTIVE: 'active',
            SUSPENDED: 'suspended',
            REJECTED: 'rejected',
          } as const;
          businesses[key[row.status]] = count;
        }
        const products = {
          total: await tx.product.count(),
          published: await tx.product.count({ where: PUBLIC_PRODUCT_SCOPE }),
        };
        const orders = {
          total: await tx.order.count(),
          sellerOrders: 0,
          open: 0,
          delivered: 0,
          cancelled: 0,
          cashOnDeliveryTotal: '0.00',
          simulatedTotal: '0.00',
          currency: 'GTQ' as const,
        };
        for (const row of await tx.sellerOrder.groupBy({
          by: ['status'],
          _count: { _all: true },
        })) {
          const count = row._count._all;
          orders.sellerOrders += count;
          if (row.status === 'DELIVERED') orders.delivered += count;
          else if (row.status === 'CANCELLED') orders.cancelled += count;
          else orders.open += count;
        }
        for (const method of ['CASH_ON_DELIVERY', 'SIMULATED'] as const) {
          const sum = await tx.sellerOrder.aggregate({
            where: { status: { not: 'CANCELLED' }, order: { paymentMethod: method } },
            _sum: { subtotal: true },
          });
          const amount = sum._sum.subtotal?.toFixed(2) ?? '0.00';
          if (method === 'SIMULATED') orders.simulatedTotal = amount;
          else orders.cashOnDeliveryTotal = amount;
        }
        return { users, businesses, products, orders };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async list(user: PublicUser, query: AdminListBusinessesDto) {
    this.authorize(user);
    const search = query.search?.replace(/[\\%_]/gu, '\\$&');
    const where: Prisma.BusinessWhereInput = {
      status: query.status,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, data] = await this.prisma.$transaction(
      [
        this.prisma.business.count({ where }),
        this.prisma.business.findMany({
          where,
          select,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      data: data.map(project),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  async byId(user: PublicUser, id: string) {
    this.authorize(user);
    const row = await this.prisma.business.findUnique({ where: { id }, select });
    if (!row) throw new NotFoundException('Tienda no encontrada');
    return project(row);
  }
  async changeStatus(user: PublicUser, id: string, dto: ChangeBusinessStatusDto) {
    this.authorize(user);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${id}::uuid FOR UPDATE`;
          const row = await tx.business.findUnique({ where: { id }, select });
          if (!row) throw new NotFoundException('Tienda no encontrada');
          // Share locks serialize eligibility changes without taking product locks in reverse order.
          const ids = [...new Set([user.id, row.ownerId])].sort();
          for (const uid of ids)
            await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${uid}::uuid FOR SHARE`;
          const actor = await tx.user.findUnique({ where: { id: user.id } });
          if (!actor?.isActive || actor.role !== 'ADMIN')
            throw new ForbiddenException('Sesión administrativa no vigente');
          if (
            row.status !== dto.expectedStatus ||
            row.updatedAt.getTime() !== new Date(dto.expectedUpdatedAt).getTime()
          )
            throw this.conflict('BUSINESS_CHANGED', 'La tienda cambió; consulta su estado actual');
          if (!transitions[row.status].includes(dto.status))
            throw this.conflict(
              'BUSINESS_TRANSITION_INVALID',
              'El cambio de estado no está permitido',
            );
          const owner = await tx.user.findUnique({ where: { id: row.ownerId } });
          if (dto.status === 'ACTIVE' && (!owner?.isActive || owner.role !== 'SELLER'))
            throw this.conflict(
              'BUSINESS_OWNER_UNAVAILABLE',
              'Para aprobar se requiere un vendedor activo',
            );
          const updatedAt = new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1));
          return project(
            await tx.business.update({
              where: { id, status: dto.expectedStatus, updatedAt: row.updatedAt },
              data: { status: dto.status, updatedAt },
              select,
            }),
          );
        },
        { timeout: 10000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2028', 'P2025'].includes(error.code)
      )
        throw this.conflict(
          'BUSINESS_CHANGED',
          'No se pudo confirmar el cambio; consulta la tienda',
        );
      throw error;
    }
  }
  private conflict(error: string, message: string) {
    return new ConflictException({ error, message });
  }
}
