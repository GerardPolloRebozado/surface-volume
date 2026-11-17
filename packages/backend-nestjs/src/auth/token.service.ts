import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '../generated/prisma/client';
import { UsersService } from '../users/users.service';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  scope: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
  scope: 'refresh';
}

@Injectable()
export class TokenService {
  private readonly jwtSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    config: ConfigService,
  ) {
    this.jwtSecret = config.get<string>(
      'JWT_SECRET',
      'a-very-secret-key-at-least-32-bytes-long-for-jwt-signing!',
    );
  }

  async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      scope: 'access',
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenVersion: user.tokenVersion,
      scope: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.jwtSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.jwtSecret,
        expiresIn: '30d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.jwtSecret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.scope !== 'refresh') {
      throw new UnauthorizedException('Invalid token scope');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return this.generateTokens(user);
  }
}
