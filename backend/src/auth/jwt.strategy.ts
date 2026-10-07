import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { isUUID } from 'class-validator';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_AUDIENCE, JWT_ISSUER } from './auth.constants';
import { invalidSession } from './auth.errors';
import { RefreshTokensService } from './refresh-tokens.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly sessions: RefreshTokensService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }

  async validate(payload: Record<string, unknown>) {
    if (
      typeof payload.sub !== 'string' ||
      !isUUID(payload.sub) ||
      typeof payload.sid !== 'string' ||
      !isUUID(payload.sid) ||
      payload.tokenUse !== 'access'
    )
      throw invalidSession();
    const user = await this.sessions.activeUser(payload.sub, payload.sid);
    if (!user) throw invalidSession();
    return user;
  }
}
