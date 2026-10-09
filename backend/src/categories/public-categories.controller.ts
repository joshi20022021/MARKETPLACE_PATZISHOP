import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { ApiErrorResponse } from '../common/api-error.dto';
import { PublicCategoryListResponse, PublicCategoryResponse } from './dto/category-response.dto';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { PublicCategoriesService } from './public-categories.service';

@ApiTags('Categorías públicas')
@Public()
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
@Controller('categories')
export class PublicCategoriesController {
  constructor(private readonly categories: PublicCategoriesService) {}

  @Get()
  @ApiOkResponse({ type: PublicCategoryListResponse })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  list(@Query() query: ListCategoriesDto) {
    return this.categories.list(query);
  }

  @Get(':slug')
  @ApiParam({
    name: 'slug',
    description: 'Slug canónico de una categoría activa.',
    example: 'tecnologia',
  })
  @ApiOkResponse({ type: PublicCategoryResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  bySlug(@Param('slug') slug: string) {
    return this.categories.bySlug(slug);
  }
}
