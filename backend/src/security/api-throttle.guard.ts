import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ApiThrottleGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(): Promise<void> {
    throw new HttpException(
      { message: 'Demasiadas solicitudes; espera antes de reintentar', error: 'TOO_MANY_REQUESTS' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
