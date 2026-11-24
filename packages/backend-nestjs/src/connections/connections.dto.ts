import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateConnectionDto {
  @ApiProperty({ example: 'mastodon' })
  @IsString()
  @MinLength(1)
  appId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({
    description: 'Field values declared by the app definition.',
    example: { instanceUrl: 'https://mastodon.social', accessToken: 'token' },
    additionalProperties: { type: 'string' },
  })
  @IsObject()
  credentials: Record<string, string>;
}

export class ConnectionResourceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  appId: string;

  @ApiProperty()
  appName: string;

  @ApiPropertyOptional({ nullable: true })
  account: string | null;

  @ApiProperty({ enum: ['active', 'expired', 'revoked', 'error'] })
  status: string;

  @ApiPropertyOptional({ nullable: true })
  lastError?: string | null;
}

export class ConnectionTestDto {
  @ApiProperty()
  ok: boolean;

  @ApiPropertyOptional({ nullable: true })
  account?: string | null;

  @ApiPropertyOptional({ nullable: true })
  message?: string | null;

  @ApiPropertyOptional({ type: () => [String] })
  scopes?: string[];
}
