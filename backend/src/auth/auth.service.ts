import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { PUBLIC_USER_SELECT } from '../users/public-user';
import { UsersService } from '../users/users.service';
import { AuthResponse } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordsService } from './passwords.service';
import { RefreshTokensService, SessionGrant } from './refresh-tokens.service';
import { invalidSession } from './auth.errors';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly passwords: PasswordsService,
    private readonly sessions: RefreshTokensService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      const grant = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name: dto.name, email: dto.email, passwordHash, role: dto.role ?? 'CUSTOMER' },
          select: PUBLIC_USER_SELECT,
        });
        return this.sessions.create(tx, user);
      });
      return this.response(grant);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException({
          message: 'El correo ya está registrado',
          error: 'EMAIL_ALREADY_EXISTS',
        });
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.users.findForLogin(dto.email);
    const matches = await this.passwords.verify(dto.password, user?.passwordHash);
    if (!user || !matches || !user.isActive)
      throw new UnauthorizedException({
        message: 'Credenciales inválidas',
        error: 'INVALID_CREDENTIALS',
      });
    const identity = { id: user.id, name: user.name, email: user.email, role: user.role };
    const grant = await this.prisma.$transaction((tx) => this.sessions.create(tx, identity));
    return this.response(grant);
  }

  async refresh(token: string | undefined) {
    return this.response(await this.sessions.rotate(token));
  }

  logout(token: string | undefined): Promise<void> {
    return this.sessions.revoke(token);
  }

  private async response(grant: SessionGrant) {
    const expiresIn = Math.min(
      this.config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS'),
      Math.floor((grant.expiresAt.getTime() - Date.now()) / 1000),
    );
    if (expiresIn <= 0) throw invalidSession();
    const accessToken = await this.jwt.signAsync(
      { sub: grant.user.id, sid: grant.familyId, tokenUse: 'access' },
      { expiresIn },
    );
    const body: AuthResponse = {
      success: true,
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: grant.user,
    };
    return { body, refreshToken: grant.refreshToken, expiresAt: grant.expiresAt };
  }
}
