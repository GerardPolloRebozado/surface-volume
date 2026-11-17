import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignUpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: "User's email address",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'johndoe',
    description: 'Unique username',
    maxLength: 64,
  })
  @IsString()
  @MaxLength(64)
  username: string;

  @ApiProperty({
    example: 'Str0ngP@ssw0rd!123',
    description: 'User password (min 12 chars)',
    minLength: 12,
    maxLength: 128,
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;
}

export class SignInDto {
  @ApiProperty({
    example: 'user@example.com',
    description: "User's email address",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Str0ngP@ssw0rd!123',
    description: 'User password',
  })
  @IsString()
  password: string;
}

export class UserResponseDto {
  @ApiProperty({
    example: '01932e6a-7b3c-7a8e-9c12-3456789abcde',
    description: 'Unique user identifier (UUIDv7)',
  })
  id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: "User's email address",
  })
  email: string;

  @ApiProperty({
    example: 'johndoe',
    description: 'Username',
  })
  username: string;

  @ApiProperty({
    example: 'user',
    description: 'User role',
  })
  role: string;

  @ApiProperty({
    example: 'pending',
    description: 'User account status',
  })
  status: string;

  @ApiProperty({
    example: '2026-11-17T20:00:00.000Z',
    description: 'Account creation date',
  })
  createdAt: Date;
}

export class SignInResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token (15m validity)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token (30d validity)',
  })
  refreshToken: string;
}

export class RefreshTokenDto {
  @ApiPropertyOptional({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Valid JWT refresh token (optional if sent via refresh_token cookie)',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6g7h8i9j0',
    description: 'Email verification token received via email',
  })
  @IsString()
  token: string;
}

export class VerifyEmailResponseDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The verified email address',
  })
  email: string;

  @ApiProperty({
    example: true,
    description: 'Confirmation that the email address has been verified',
  })
  emailVerified: boolean;
}
