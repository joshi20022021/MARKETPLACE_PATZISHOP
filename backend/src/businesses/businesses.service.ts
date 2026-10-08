import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { ResourceScopeService } from '../security/resource-scope.service';
import type { PublicUser } from '../users/public-user';
import { SELLER_BUSINESS_SELECT, SellerBusinessResponse } from './dto/business-response.dto';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopes: ResourceScopeService,
  ) {}

  async create(user: PublicUser, dto: CreateBusinessDto): Promise<SellerBusinessResponse> {
    this.scopes.sellerBusiness(user);
    try {
      return await this.prisma.business.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description ?? '',
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          logo: dto.logo,
          banner: dto.banner,
          ownerId: user.id,
          status: 'PENDING',
        },
        select: SELLER_BUSINESS_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const own = await this.prisma.business.findUnique({
          where: { ownerId: user.id },
          select: { id: true },
        });
        if (own)
          throw new ConflictException({
            message: 'Ya tienes una tienda registrada',
            error: 'BUSINESS_ALREADY_EXISTS',
          });
        throw this.slugConflict();
      }
      throw error;
    }
  }

  async own(user: PublicUser): Promise<SellerBusinessResponse> {
    return this.scopes.requireFound(
      await this.prisma.business.findFirst({
        where: this.scopes.sellerBusiness(user),
        select: SELLER_BUSINESS_SELECT,
      }),
    );
  }

  async update(user: PublicUser, dto: UpdateBusinessDto): Promise<SellerBusinessResponse> {
    const scope = this.scopes.sellerBusiness(user);
    if (!Object.values(dto).some((value) => value !== undefined))
      throw new BadRequestException({
        message: 'Debes enviar al menos un campo editable',
        error: 'EMPTY_UPDATE',
      });
    try {
      return await this.prisma.business.update({
        where: { ownerId: user.id, AND: scope },
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          logo: dto.logo,
          banner: dto.banner,
        },
        select: SELLER_BUSINESS_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw this.slugConflict();
        if (error.code === 'P2025') return this.scopes.requireFound<never>(null);
      }
      throw error;
    }
  }

  private slugConflict() {
    return new ConflictException({
      message: 'El slug no está disponible',
      error: 'BUSINESS_SLUG_UNAVAILABLE',
    });
  }
}
