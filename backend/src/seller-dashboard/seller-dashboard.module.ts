import { Controller, Get, Header, Module } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { PublicUser } from '../users/public-user';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { ApiErrorResponse } from '../common/api-error.dto';
import { SellerDashboardService } from './seller-dashboard.service';
import { SellerDashboardResponse } from './seller-dashboard.dto';
@Controller('seller/dashboard')
@Roles('SELLER')
@ApiTags('Panel de mi tienda')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorResponse })
@ApiForbiddenResponse({ type: ApiErrorResponse })
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
export class SellerDashboardController {
  constructor(private readonly dashboard: SellerDashboardService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: SellerDashboardResponse })
  summary(@CurrentUser() user: PublicUser) {
    return this.dashboard.summary(user);
  }
}
@Module({
  imports: [DatabaseModule, SecurityModule],
  controllers: [SellerDashboardController],
  providers: [SellerDashboardService],
})
export class SellerDashboardModule {}
