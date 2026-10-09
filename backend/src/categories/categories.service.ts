import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { ResourceScopeService } from '../security/resource-scope.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
import {
  ADMIN_CATEGORY_SELECT,
  AdminCategoryListResponse,
  AdminCategoryResponse,
} from './dto/category-response.dto';
import { AdminListCategoriesDto } from './dto/list-categories.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopes: ResourceScopeService,
  ) {}

  async create(dto: CreateCategoryDto): Promise<AdminCategoryResponse> {
    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description ?? '',
          isActive: dto.isActive ?? true,
        },
        select: ADMIN_CATEGORY_SELECT,
      });
    } catch (error) {
      return this.handleWriteError(error);
    }
  }

  async list(query: AdminListCategoriesDto): Promise<AdminCategoryListResponse> {
    const search = query.search?.replace(/[\\%_]/gu, '\\$&');
    const where: Prisma.CategoryWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
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
          select: ADMIN_CATEGORY_SELECT,
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

  async byId(id: string): Promise<AdminCategoryResponse> {
    return this.scopes.requireFound(
      await this.prisma.category.findUnique({ where: { id }, select: ADMIN_CATEGORY_SELECT }),
    );
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<AdminCategoryResponse> {
    if (!Object.values(dto).some((value) => value !== undefined))
      throw new BadRequestException({
        message: 'Debes enviar al menos un campo editable',
        error: 'EMPTY_UPDATE',
      });
    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          isActive: dto.isActive,
        },
        select: ADMIN_CATEGORY_SELECT,
      });
    } catch (error) {
      return this.handleWriteError(error);
    }
  }

  private handleWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        throw new ConflictException({
          message: 'El slug no está disponible',
          error: 'CATEGORY_SLUG_UNAVAILABLE',
        });
      if (error.code === 'P2025') return this.scopes.requireFound<never>(null);
    }
    throw error;
  }
}
