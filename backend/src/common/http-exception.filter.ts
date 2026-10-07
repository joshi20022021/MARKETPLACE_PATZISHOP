import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

const codes: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  503: 'SERVICE_UNAVAILABLE',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    if (response.headersSent) return;
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] =
      status >= 500
        ? 'Error interno del servidor'
        : status === 404
          ? 'Recurso no encontrado'
          : 'Solicitud no válida';
    let error = codes[status] ?? (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'HTTP_ERROR');
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string' && status < 500) message = body;
      if (typeof body === 'object' && body !== null) {
        const data = body as Record<string, unknown>;
        const databaseUnavailable = status === 503 && data.error === 'DATABASE_UNAVAILABLE';
        const standardClientError =
          typeof data.error === 'string' && !/^[A-Z][A-Z0-9_]*$/u.test(data.error);
        if ((status < 500 && !standardClientError) || databaseUnavailable) {
          if (
            typeof data.message === 'string' ||
            (Array.isArray(data.message) &&
              data.message.every((item: unknown) => typeof item === 'string'))
          )
            message = data.message;
          if (typeof data.error === 'string' && /^[A-Z][A-Z0-9_]*$/u.test(data.error))
            error = data.error;
        }
      }
    }
    if (status >= 500 && error !== 'DATABASE_UNAVAILABLE')
      this.logger.error('Error interno al procesar la solicitud.');
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error,
      path: request.path,
      timestamp: new Date().toISOString(),
    });
  }
}
