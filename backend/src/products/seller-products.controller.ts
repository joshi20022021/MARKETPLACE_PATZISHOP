import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { ApiErrorResponse } from '../common/api-error.dto';
import { PublicUser } from '../users/public-user';
import { CreateProductDto, UpdateProductDto } from './dto/product-input.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { ProductListResponse, ProductResponse } from './dto/product-response.dto';
import { ProductsService } from './products.service';
@ApiTags('Mis productos')
@ApiBearerAuth()
@Roles('SELLER')
@ApiUnauthorizedResponse({ type: ApiErrorResponse })
@ApiForbiddenResponse({ type: ApiErrorResponse })
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
@ApiBadRequestResponse({ type: ApiErrorResponse })
@ApiNotFoundResponse({ type: ApiErrorResponse })
@ApiConflictResponse({ type: ApiErrorResponse })
@Controller('seller/products')
export class SellerProductsController {
  constructor(private readonly products: ProductsService) {}
  @Post()
  @ApiCreatedResponse({ type: ProductResponse })
  create(@CurrentUser() user: PublicUser, @Body() dto: CreateProductDto) {
    return this.products.create(user, dto);
  }
  @Get()
  @ApiOkResponse({ type: ProductListResponse })
  list(@CurrentUser() user: PublicUser, @Query() query: ListProductsDto) {
    return this.products.list(user, query);
  }
  @Get(':id')
  @ApiOkResponse({ type: ProductResponse })
  byId(@CurrentUser() user: PublicUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.products.byId(user, id);
  }
  @Patch(':id')
  @ApiOkResponse({ type: ProductResponse })
  update(
    @CurrentUser() user: PublicUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user, id, dto);
  }
  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@CurrentUser() user: PublicUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.products.remove(user, id);
  }
}
