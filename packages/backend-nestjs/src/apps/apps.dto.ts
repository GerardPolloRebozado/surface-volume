import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AppFieldDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  label: string;

  @ApiProperty({
    enum: ['string', 'text', 'number', 'boolean', 'select', 'datetime', 'json', 'file'],
  })
  type: string;

  @ApiPropertyOptional()
  required?: boolean;

  @ApiPropertyOptional()
  secret?: boolean;

  @ApiPropertyOptional()
  helpText?: string;

  @ApiPropertyOptional()
  default?: unknown;

  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' } })
  choices?: Record<string, string>;
}

export class AppAuthDto {
  @ApiProperty({
    enum: ['none', 'api_key', 'basic', 'oauth2', 'custom'],
  })
  type: string;

  @ApiProperty({ type: () => [AppFieldDto] })
  fields: AppFieldDto[];
}

export class AppCatalogueDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: () => AppAuthDto })
  auth: AppAuthDto;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  triggers: Record<string, string>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  actions: Record<string, string>;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'object' },
  })
  triggerFields: Record<string, AppFieldDto[]>;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'object' },
  })
  actionFields: Record<string, AppFieldDto[]>;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'object' },
  })
  triggerOutputs: Record<string, AppFieldDto[]>;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'object' },
  })
  actionOutputs: Record<string, AppFieldDto[]>;
}
