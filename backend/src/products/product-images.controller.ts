import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { ApiErrorResponse } from '../common/api-error.dto';
import { PublicUser } from '../users/public-user';
import { ProductResponse } from './dto/product-response.dto';
import { MAX_IMAGE_BYTES, ProductImagesService } from './product-images.service';

@ApiTags('Imágenes de mis productos')
@ApiBearerAuth()
@Roles('SELLER')
@ApiUnauthorizedResponse({ type: ApiErrorResponse })
@ApiForbiddenResponse({ type: ApiErrorResponse })
@ApiNotFoundResponse({ type: ApiErrorResponse })
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
@ApiBadRequestResponse({ type: ApiErrorResponse })
@Controller('seller/products/:id/images')
export class ProductImagesController {
  constructor(private readonly images: ProductImagesService) {}
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: ProductResponse })
  @ApiConflictResponse({ type: ApiErrorResponse })
  @ApiPayloadTooLargeResponse({ type: ApiErrorResponse })
  @ApiUnsupportedMediaTypeResponse({ type: ApiErrorResponse })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0, parts: 1 },
    }),
  )
  upload(
    @CurrentUser() user: PublicUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.images.upload(user, id, file);
  }
  @Delete(':imageId')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(
    @CurrentUser() user: PublicUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('imageId', new ParseUUIDPipe()) imageId: string,
  ) {
    return this.images.remove(user, id, imageId);
  }
  @Get(':imageId/file')
  @ApiProduces('image/webp')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @Header('Cache-Control', 'no-store')
  async ownFile(
    @CurrentUser() user: PublicUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('imageId', new ParseUUIDPipe()) imageId: string,
  ) {
    return new StreamableFile(await this.images.ownFile(user, id, imageId), {
      type: 'image/webp',
      disposition: 'inline',
    });
  }
}

@ApiTags('Imágenes públicas')
@Public()
@Controller('media/products')
export class ProductMediaController {
  constructor(private readonly images: ProductImagesService) {}
  @Get(':key')
  @ApiProduces('image/webp')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  @ApiTooManyRequestsResponse({ type: ApiErrorResponse })
  @Header('Cache-Control', 'no-store')
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  async publicFile(@Param('key') key: string) {
    return new StreamableFile(await this.images.publicFile(key), {
      type: 'image/webp',
      disposition: 'inline',
    });
  }
}
