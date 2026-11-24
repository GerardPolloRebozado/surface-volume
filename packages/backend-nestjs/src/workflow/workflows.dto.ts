import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateWorkflowDto {
  @ApiProperty({ example: 'Reply to mentions' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class SaveWorkflowDto extends CreateWorkflowDto {
  @ApiProperty({
    description: '{ trigger, nodes, links }',
    example: {
      trigger: { id: 'trigger', appId: 'mastodon', triggerKey: 'new_notification', inputs: {} },
      nodes: [
        {
          id: 'reply',
          type: 'action',
          appId: 'mastodon',
          actionKey: 'post_status',
          inputs: { status: 'Thanks for the mention' },
        },
      ],
      links: [{ id: 'link-1', from: 'trigger', to: 'reply' }],
    },
  })
  @IsObject()
  definition: Record<string, unknown>;
}

export class RunNowDto {
  @ApiProperty()
  runId: string;
}
