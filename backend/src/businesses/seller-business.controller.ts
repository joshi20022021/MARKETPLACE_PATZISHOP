import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
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
import { ApiErrorResponse } from '../common/api-error.dto';
import { PublicUser } from '../users/public-user';
import { BusinessesService } from './businesses.service';
import { SellerBusinessResponse } from './dto/business-response.dto';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@ApiTags('Mi negocio')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorResponse })
@ApiForbiddenResponse({ type: ApiErrorResponse })
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
@Roles('SELLER')
@Controller('seller/business')
export class SellerBusinessController {
  constructor(private readonly businesses: BusinessesService) {}

  @Post()
  @ApiCreatedResponse({ type: SellerBusinessResponse })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  @ApiConflictResponse({ type: ApiErrorResponse })
  create(@CurrentUser() user: PublicUser, @Body() dto: CreateBusinessDto) {
    return this.businesses.create(user, dto);
  }

  @Get()
  @ApiOkResponse({ type: SellerBusinessResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  own(@CurrentUser() user: PublicUser) {
    return this.businesses.own(user);
  }

  @Patch()
  @ApiOkResponse({ type: SellerBusinessResponse })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  @ApiConflictResponse({ type: ApiErrorResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  update(@CurrentUser() user: PublicUser, @Body() dto: UpdateBusinessDto) {
    return this.businesses.update(user, dto);
  }
}
