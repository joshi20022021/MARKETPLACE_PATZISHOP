import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { ResourceScopeService } from '../security/resource-scope.service';
import { BusinessListResponse } from './dto/business-list-response.dto';
import { PUBLIC_BUSINESS_SELECT, PublicBusinessResponse } from './dto/business-response.dto';
import { ListBusinessesDto } from './dto/list-businesses.dto';

const visibleBusiness: Prisma.BusinessWhereInput = {
  status: 'ACTIVE',
  owner: { isActive: true, role: 'SELLER' },
};

@Injectable()
export class PublicBusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopes: ResourceScopeService,
  ) {}

  async list(query: ListBusinessesDto): Promise<BusinessListResponse> {
    // Prisma contains uses LIKE; escape pattern metacharacters to keep search literal.
    const search = query.search?.replace(/[\\%_]/gu, '\\$&');
    const where: Prisma.BusinessWhereInput = {
      ...visibleBusiness,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, data] = await this.prisma.$transaction(
      [
        this.prisma.business.count({ where }),
        this.prisma.business.findMany({
          where,
          select: PUBLIC_BUSINESS_SELECT,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      success: true,
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async bySlug(slug: string): Promise<PublicBusinessResponse> {
    return this.scopes.requireFound(
      await this.prisma.business.findFirst({
        where: { AND: [{ slug }, visibleBusiness] },
        select: PUBLIC_BUSINESS_SELECT,
      }),
    );
  }
}
