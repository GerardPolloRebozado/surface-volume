import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkflowSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty({ enum: ['draft', 'on', 'off', 'error'] })
  status: string;

  @ApiPropertyOptional({ nullable: true })
  statusReason: string | null;

  @ApiProperty()
  version: number;

  @ApiProperty({ type: 'object', additionalProperties: true })
  trigger: object;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  nodes: object[];

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  links: object[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ nullable: true })
  lastRunAt: string | null;
}

export class WorkflowRunSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workflowId: string;

  @ApiProperty()
  versionId: string;

  @ApiProperty()
  mode: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  queuedAt: string;

  @ApiPropertyOptional({ nullable: true })
  startedAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  finishedAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  errorNodeId: string | null;

  @ApiPropertyOptional({ nullable: true })
  errorKind: string | null;

  @ApiPropertyOptional({ nullable: true })
  errorMessage: string | null;
}

export class WorkflowListItemDto {
  @ApiProperty({ type: () => WorkflowSummaryDto })
  workflow: WorkflowSummaryDto;

  @ApiProperty({ type: () => [String] })
  services: string[];

  @ApiPropertyOptional({ nullable: true, type: () => WorkflowRunSummaryDto })
  lastRun: WorkflowRunSummaryDto | null;

  @ApiProperty({ type: () => [Number] })
  runsLast7Days: number[];
}
