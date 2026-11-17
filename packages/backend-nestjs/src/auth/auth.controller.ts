import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  CurrentUser,
  EmailVerificationService,
  Public,
} from '@nestjs/authentication';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  RefreshTokenDto,
  SignInDto,
  SignInResponseDto,
  SignUpDto,
  UserResponseDto,
} from './auth.dto.js';
import { CredentialsService } from './credentials.service.js';
import { TokenService } from './token.service.js';
import { UsersService } from '../users/users.service.js';
import { User } from '../generated/prisma/client.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Public()
  @Post('sign-up')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiCreatedResponse({
    description: 'User registered successfully. Verification email sent.',
  })
  @ApiConflictResponse({
    description: 'Email or username already registered',
  })
  async signUp(@Body() body: SignUpDto): Promise<void> {
    const user = await this.credentialsService.register(
      body.username,
      body.email,
      body.password,
    );
    await this.emailVerificationService.send(user);
  }

  @Public()
  @Post('sign-in')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiOkResponse({
    description:
      'Successfully authenticated. Returns access and refresh JWT tokens in body and HttpOnly cookies.',
    type: SignInResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password',
  })
  async signIn(
    @Body() body: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SignInResponseDto> {
    const user = await this.credentialsService.verify(
      body.email,
      body.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const tokens = await this.tokenService.generateTokens(user);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh JWT access token using body or cookie' })
  @ApiOkResponse({
    description: 'Tokens successfully refreshed',
    type: SignInResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid, expired, or revoked refresh token',
  })
  async refresh(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SignInResponseDto> {
    const refreshToken = body?.refreshToken || req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }
    const tokens = await this.tokenService.refreshTokens(refreshToken);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return tokens;
  }

  @Get('me')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get profile of the currently authenticated user' })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer token',
  })
  getMe(@CurrentUser() user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  @Post('sign-out')
  @HttpCode(200)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Sign out and invalidate all tokens for current user',
  })
  @ApiOkResponse({
    description: 'Successfully signed out from all devices',
  })
  async signOut(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    this.clearAuthCookies(res);
    await this.usersService.incrementTokenVersion(user.id);
    return { success: true };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
  }
}
