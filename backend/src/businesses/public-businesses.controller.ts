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
import { BusinessListResponse } from './dto/business-list-response.dto';
import { PublicBusinessResponse } from './dto/business-response.dto';
import { ListBusinessesDto } from './dto/list-businesses.dto';
import { PublicBusinessesService } from './public-businesses.service';

@ApiTags('Tiendas públicas')
@Public()
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
@Controller('businesses')
export class PublicBusinessesController {
  constructor(private readonly businesses: PublicBusinessesService) {}

  @Get()
  @ApiOkResponse({ type: BusinessListResponse })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  list(@Query() query: ListBusinessesDto) {
    return this.businesses.list(query);
  }

  @Get(':slug')
  @ApiParam({
    name: 'slug',
    description: 'Slug canónico de una tienda ACTIVE.',
    example: 'tecnologia-patzi',
  })
  @ApiOkResponse({ type: PublicBusinessResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  bySlug(@Param('slug') slug: string) {
    return this.businesses.bySlug(slug);
  }
}
