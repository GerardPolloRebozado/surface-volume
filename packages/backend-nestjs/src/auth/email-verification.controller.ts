import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import {
  CurrentUser,
  EmailVerificationService,
  Public,
} from '@nestjs/authentication';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '../generated/prisma/client';
import { VerifyEmailDto, VerifyEmailResponseDto } from './auth.dto.js';

@ApiTags('auth')
@Controller('auth/email')
export class EmailVerificationController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Public()
  @Post('verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiOkResponse({
    description: 'Email successfully verified',
    type: VerifyEmailResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired link',
  })
  async verify(@Body() body: VerifyEmailDto): Promise<VerifyEmailResponseDto> {
    const verified = await this.emailVerificationService.verify(body.token);
    if (!verified) {
      throw new BadRequestException('Invalid or expired link');
    }
    return { email: verified.email, emailVerified: true };
  }

  @Post('verification')
  @HttpCode(202)
  @ApiOperation({ summary: 'Resend verification email to current user' })
  @ApiAcceptedResponse({
    description: 'Verification email sent',
  })
  @ApiConflictResponse({
    description: 'Email address already verified',
  })
  async resend(@CurrentUser() user: User): Promise<void> {
    if (user.emailVerifiedAt) {
      throw new ConflictException('Email address already verified');
    }
    await this.emailVerificationService.send(user);
  }
}
