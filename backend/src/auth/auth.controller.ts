import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiHeader,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiErrorResponse } from '../common/api-error.dto';
import { AUTH_RATE_LIMITS, RATE_LIMIT_WINDOW_MS } from '../security/rate-limit.policy';
import type { Request, Response } from 'express';
import { PublicUser } from '../users/public-user';
import { AUTH_COOKIE_PATH, CSRF_HEADER_DOC, REFRESH_COOKIE } from './auth.constants';
import { AuthOriginGuard } from './auth-origin.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { AuthResponse } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';

@ApiTags('Autenticación')
@ApiTooManyRequestsResponse({
  type: ApiErrorResponse,
  description: 'Límite por IP alcanzado; respetar Retry-After.',
})
@UseGuards(AuthOriginGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.getOrThrow<string>('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      path: AUTH_COOKIE_PATH,
    };
  }

  private token(request: Request): string | undefined {
    const cookies: unknown = request.cookies;
    if (!cookies || typeof cookies !== 'object') return undefined;
    const value: unknown = (cookies as Record<string, unknown>)[REFRESH_COOKIE];
    return typeof value === 'string' ? value : undefined;
  }

  private send(response: Response, grant: Awaited<ReturnType<AuthService['login']>>): AuthResponse {
    response.cookie(REFRESH_COOKIE, grant.refreshToken, {
      ...this.cookieOptions(),
      expires: grant.expiresAt,
    });
    return grant.body;
  }

  @Post('register')
  @Throttle({ default: { limit: AUTH_RATE_LIMITS.register, ttl: RATE_LIMIT_WINDOW_MS } })
  @Public()
  @ApiHeader(CSRF_HEADER_DOC)
  @ApiCreatedResponse({ type: AuthResponse })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    return this.send(response, await this.auth.register(dto));
  }

  @Post('login')
  @Throttle({ default: { limit: AUTH_RATE_LIMITS.login, ttl: RATE_LIMIT_WINDOW_MS } })
  @Public()
  @HttpCode(200)
  @ApiHeader(CSRF_HEADER_DOC)
  @ApiOkResponse({ type: AuthResponse })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.send(response, await this.auth.login(dto));
  }

  @Post('refresh')
  @Throttle({ default: { limit: AUTH_RATE_LIMITS.refresh, ttl: RATE_LIMIT_WINDOW_MS } })
  @Public()
  @HttpCode(200)
  @ApiHeader(CSRF_HEADER_DOC)
  @ApiCookieAuth()
  @ApiOkResponse({ type: AuthResponse })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      return this.send(response, await this.auth.refresh(this.token(request)));
    } catch (error) {
      if (error instanceof UnauthorizedException)
        response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw error;
    }
  }

  @Post('logout')
  @Throttle({ default: { limit: AUTH_RATE_LIMITS.logout, ttl: RATE_LIMIT_WINDOW_MS } })
  @Public()
  @HttpCode(204)
  @ApiHeader(CSRF_HEADER_DOC)
  @ApiCookieAuth()
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(this.token(request));
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ type: PublicUser })
  me(@CurrentUser() user: PublicUser): PublicUser {
    return user;
  }
}
