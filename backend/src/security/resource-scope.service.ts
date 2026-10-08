import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Role } from '../generated/prisma/client';
import type { PublicUser } from '../users/public-user';

/** Keep these predicates in the SELECT/UPDATE/DELETE, rather than checking then writing by id. */
@Injectable()
export class ResourceScopeService {
  private requireRole(user: PublicUser, role: Role): void {
    if (user.role !== role)
      throw new ForbiddenException({
        message: 'No tienes permiso para esta operación',
        error: 'ROLE_FORBIDDEN',
      });
  }

  sellerBusiness(user: PublicUser): Prisma.BusinessWhereInput {
    this.requireRole(user, 'SELLER');
    return { ownerId: user.id };
  }

  sellerProduct(user: PublicUser): Prisma.ProductWhereInput {
    return { business: this.sellerBusiness(user) };
  }

  sellerOrder(user: PublicUser): Prisma.SellerOrderWhereInput {
    return { business: this.sellerBusiness(user) };
  }

  customerOrder(user: PublicUser): Prisma.OrderWhereInput {
    this.requireRole(user, 'CUSTOMER');
    return { customerId: user.id };
  }

  ownAddress(user: PublicUser): Prisma.AddressWhereInput {
    // Every authenticated role can own addresses; never use a submitted userId.
    return { userId: user.id };
  }

  requireFound<T>(resource: T | null): T {
    if (resource === null)
      throw new NotFoundException({
        message: 'Recurso no encontrado',
        error: 'RESOURCE_NOT_FOUND',
      });
    return resource;
  }
}
