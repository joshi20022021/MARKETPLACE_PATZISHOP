import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CartsService } from './carts.service';
import { AddCartItemDto, CartQuantityDto } from './dto/cart-input.dto';
import { CartResponse } from './dto/cart-response.dto';
@ApiTags('Mi carrito')
@ApiBearerAuth()
@Roles('CUSTOMER')
@ApiUnauthorizedResponse({ type: ApiErrorResponse })
@ApiForbiddenResponse({ type: ApiErrorResponse })
@ApiBadRequestResponse({ type: ApiErrorResponse })
@ApiNotFoundResponse({ type: ApiErrorResponse })
@ApiConflictResponse({ type: ApiErrorResponse })
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
@Controller('cart')
export class CartsController {
  constructor(private readonly carts: CartsService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: CartResponse })
  read(@CurrentUser() user: PublicUser) {
    return this.carts.read(user);
  }
  @Post('items')
  @ApiCreatedResponse({ type: CartResponse })
  add(@CurrentUser() user: PublicUser, @Body() input: AddCartItemDto) {
    return this.carts.add(user, input);
  }
  @Patch('items/:id')
  @ApiOkResponse({ type: CartResponse })
  update(
    @CurrentUser() user: PublicUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: CartQuantityDto,
  ) {
    return this.carts.update(user, id, input);
  }
  @Delete('items/:id')
  @ApiOkResponse({ type: CartResponse })
  remove(@CurrentUser() user: PublicUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.carts.remove(user, id);
  }
}
