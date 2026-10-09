import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { ResourceScopeService } from '../security/resource-scope.service';
import {
  PUBLIC_CATEGORY_SELECT,
  PublicCategoryListResponse,
  PublicCategoryResponse,
} from './dto/category-response.dto';
import { ListCategoriesDto } from './dto/list-categories.dto';

@Injectable()
export class PublicCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopes: ResourceScopeService,
  ) {}

  async list(query: ListCategoriesDto): Promise<PublicCategoryListResponse> {
    const search = query.search?.replace(/[\\%_]/gu, '\\$&');
    const where: Prisma.CategoryWhereInput = {
      isActive: true,
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
        this.prisma.category.count({ where }),
        this.prisma.category.findMany({
          where,
          select: PUBLIC_CATEGORY_SELECT,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
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

  async bySlug(slug: string): Promise<PublicCategoryResponse> {
    return this.scopes.requireFound(
      await this.prisma.category.findFirst({
        where: { slug, isActive: true },
        select: PUBLIC_CATEGORY_SELECT,
      }),
    );
  }
}
