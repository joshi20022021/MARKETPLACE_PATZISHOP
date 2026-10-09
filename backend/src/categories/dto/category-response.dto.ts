import { ApiProperty } from '@nestjs/swagger';
import type { Prisma } from '../../generated/prisma/client';

export const PUBLIC_CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
} satisfies Prisma.CategorySelect;

export const ADMIN_CATEGORY_SELECT = {
  ...PUBLIC_CATEGORY_SELECT,
  isActive: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CategorySelect;

export class PublicCategoryResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() description!: string;
}

export class AdminCategoryResponse extends PublicCategoryResponse {
  @ApiProperty() isActive!: boolean;
  @ApiProperty({
    type: String,
    nullable: true,
    format: 'uuid',
    description: 'Reservado para subcategorías; no editable en esta fase.',
  })
  parentId!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
}

export class CategoryPageMeta {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class AdminCategoryListResponse {
  @ApiProperty({ example: true }) success!: true;
  @ApiProperty({ type: [AdminCategoryResponse] }) data!: AdminCategoryResponse[];
  @ApiProperty({ type: CategoryPageMeta }) meta!: CategoryPageMeta;
}

export class PublicCategoryListResponse {
  @ApiProperty({ example: true }) success!: true;
  @ApiProperty({ type: [PublicCategoryResponse] }) data!: PublicCategoryResponse[];
  @ApiProperty({ type: CategoryPageMeta }) meta!: CategoryPageMeta;
}
