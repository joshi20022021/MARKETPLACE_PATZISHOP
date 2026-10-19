import { Body, Controller, Get, Header, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { PublicUser } from '../users/public-user';
import { ApiErrorResponse } from '../common/api-error.dto';
import { CheckoutPreviewDto } from './dto/checkout-input.dto';
import { CheckoutOptions, CheckoutPreview } from './dto/checkout-response.dto';
import { CheckoutService } from './checkout.service';
@ApiTags('Checkout')
@ApiBearerAuth()
@Roles('CUSTOMER')
@ApiUnauthorizedResponse({ type: ApiErrorResponse })
@ApiForbiddenResponse({ type: ApiErrorResponse })
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}
  @Get('options')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: CheckoutOptions })
  options(@CurrentUser() user: PublicUser) {
    return this.checkout.options(user);
  }
  @Post('preview')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: CheckoutPreview })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  @ApiConflictResponse({ type: ApiErrorResponse })
  preview(@CurrentUser() user: PublicUser, @Body() input: CheckoutPreviewDto) {
    return this.checkout.preview(user, input);
  }
}
