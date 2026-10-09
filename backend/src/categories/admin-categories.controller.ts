import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { ApiErrorResponse } from '../common/api-error.dto';
import { CategoriesService } from './categories.service';
import { AdminCategoryListResponse, AdminCategoryResponse } from './dto/category-response.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
import { AdminListCategoriesDto } from './dto/list-categories.dto';

@ApiTags('Categorías administrativas')
@ApiBearerAuth()
@Roles('ADMIN')
@ApiUnauthorizedResponse({ type: ApiErrorResponse })
@ApiForbiddenResponse({ type: ApiErrorResponse })
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
@ApiBadRequestResponse({ type: ApiErrorResponse })
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  @ApiCreatedResponse({ type: AdminCategoryResponse })
  @ApiConflictResponse({ type: ApiErrorResponse })
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: AdminCategoryListResponse })
  list(@Query() query: AdminListCategoriesDto) {
    return this.categories.list(query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminCategoryResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  byId(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categories.byId(id);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminCategoryResponse })
  @ApiConflictResponse({ type: ApiErrorResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }
}
