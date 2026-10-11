import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { ApiErrorResponse } from '../common/api-error.dto';
import { ListPublicProductsDto } from './dto/list-public-products.dto';
import {
  PublicProductListResponse,
  PublicProductResponse,
} from './dto/public-product-response.dto';
import { PublicProductsService } from './public-products.service';
@ApiTags('Catálogo público')
@Public()
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
@Controller('products')
export class PublicProductsController {
  constructor(private readonly products: PublicProductsService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: PublicProductListResponse })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  list(@Query() query: ListPublicProductsDto) {
    return this.products.list(query);
  }
  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: PublicProductResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  bySlug(@Param('slug') slug: string) {
    return this.products.bySlug(slug);
  }
}
