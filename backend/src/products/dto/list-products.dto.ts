import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ListCategoriesDto } from '../../categories/dto/list-categories.dto';
import { ProductStatus } from '../../generated/prisma/enums';
export class ListProductsDto extends ListCategoriesDto {
  @ApiPropertyOptional({
    maxLength: 120,
    description: 'Busca nombre o SKU; %, _ y barra inversa son literales.',
  })
  declare search?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
