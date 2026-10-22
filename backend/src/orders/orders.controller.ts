import {
  Body,
  Controller,
  Get,
  Header,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { PublicUser } from '../users/public-user';
import { ApiErrorResponse } from '../common/api-error.dto';
import { OrdersService } from './orders.service';
import {
  ConfirmOrderDto,
  ListOrdersDto,
  ListSellerOrdersDto,
  ChangeSellerOrderStatusDto,
  CancelSellerOrderDto,
} from './dto/order-input.dto';
import { OrderTransitionsService } from './order-transitions.service';
import {
  OrderResponse,
  OrderListResponse,
  SellerOrderDetail,
  SellerOrderListResponse,
} from './dto/order-response.dto';
@ApiTags('Mis pedidos')
@ApiBearerAuth()
@Roles('CUSTOMER')
@ApiUnauthorizedResponse({ type: ApiErrorResponse })
@ApiForbiddenResponse({ type: ApiErrorResponse })
@ApiBadRequestResponse({ type: ApiErrorResponse })
@ApiNotFoundResponse({ type: ApiErrorResponse })
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly transitions: OrderTransitionsService,
  ) {}
  @Patch('seller-orders/:id/cancel')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: SellerOrderDetail })
  @ApiConflictResponse({ type: ApiErrorResponse })
  cancel(
    @CurrentUser() user: PublicUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: CancelSellerOrderDto,
  ) {
    return this.transitions.change(user, id, { ...input, status: 'CANCELLED' });
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiCreatedResponse({ type: OrderResponse })
  @ApiConflictResponse({ type: ApiErrorResponse })
  confirm(@CurrentUser() user: PublicUser, @Body() input: ConfirmOrderDto) {
    return this.orders.confirm(user, input);
  }
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: OrderListResponse })
  list(@CurrentUser() user: PublicUser, @Query() query: ListOrdersDto) {
    return this.orders.list(user, query);
  }
  @Get('confirmation/:key')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: OrderResponse })
  byConfirmation(
    @CurrentUser() user: PublicUser,
    @Param('key', new ParseUUIDPipe({ version: '4' })) key: string,
  ) {
    return this.orders.byConfirmation(user, key);
  }
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: OrderResponse })
  byId(@CurrentUser() user: PublicUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.orders.byId(user, id);
  }
}
@ApiTags('Pedidos de mi tienda')
@ApiBearerAuth()
@Roles('SELLER')
@ApiUnauthorizedResponse({ type: ApiErrorResponse })
@ApiForbiddenResponse({ type: ApiErrorResponse })
@ApiBadRequestResponse({ type: ApiErrorResponse })
@ApiNotFoundResponse({ type: ApiErrorResponse })
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
@Controller('seller/orders')
export class SellerOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly transitions: OrderTransitionsService,
  ) {}
  @Patch(':id/status')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: SellerOrderDetail })
  @ApiConflictResponse({ type: ApiErrorResponse })
  change(
    @CurrentUser() user: PublicUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: ChangeSellerOrderStatusDto,
  ) {
    return this.transitions.change(user, id, input);
  }
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: SellerOrderListResponse })
  list(@CurrentUser() user: PublicUser, @Query() query: ListSellerOrdersDto) {
    return this.orders.sellerList(user, query);
  }
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: SellerOrderDetail })
  byId(@CurrentUser() user: PublicUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.orders.sellerById(user, id);
  }
}
