import {
  Body,
  Controller,
  Get,
  Header,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { PublicUser } from '../users/public-user';
import { DatabaseModule } from '../database/database.module';
import { ApiErrorResponse } from '../common/api-error.dto';
import {
  AdminBusinessListResponse,
  AdminBusinessResponse,
  AdminDashboardResponse,
  AdminListBusinessesDto,
  ChangeBusinessStatusDto,
} from './admin.dto';
import { AdminService } from './admin.service';
@Controller('admin')
@Roles('ADMIN')
@ApiTags('Administración de plataforma')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorResponse })
@ApiForbiddenResponse({ type: ApiErrorResponse })
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
@ApiBadRequestResponse({ type: ApiErrorResponse })
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('dashboard')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AdminDashboardResponse })
  summary(@CurrentUser() user: PublicUser) {
    return this.admin.summary(user);
  }
  @Get('businesses')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AdminBusinessListResponse })
  list(@CurrentUser() user: PublicUser, @Query() query: AdminListBusinessesDto) {
    return this.admin.list(user, query);
  }
  @Get('businesses/:id')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AdminBusinessResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  byId(@CurrentUser() user: PublicUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.admin.byId(user, id);
  }
  @Patch('businesses/:id/status')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AdminBusinessResponse })
  @ApiConflictResponse({ type: ApiErrorResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  changeStatus(
    @CurrentUser() user: PublicUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeBusinessStatusDto,
  ) {
    return this.admin.changeStatus(user, id, dto);
  }
}
@Module({ imports: [DatabaseModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
