import { UnauthorizedException } from '@nestjs/common';

export function invalidSession(): UnauthorizedException {
  return new UnauthorizedException({
    message: 'Sesión inválida o vencida',
    error: 'INVALID_SESSION',
  });
}
