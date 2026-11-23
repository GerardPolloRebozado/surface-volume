import { Public } from '@nestjs/authentication';
import {
  Body,
  ConflictException,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TriggersService } from '../triggers/triggers.service';
import { InternalGuard } from './internal.guard';
import { StepRunnerService } from './step-runner.service';

@Public()
@Controller('internal')
@UseGuards(InternalGuard)
export class InternalController {
  constructor(
    private readonly steps: StepRunnerService,
    private readonly triggers: TriggersService,
  ) {}

  @Post('steps/:stepId/run')
  async runStep(
    @Param('stepId') stepId: string,
    @Body() body: { attempt?: number },
  ) {
    const result = await this.steps.run(stepId, body?.attempt ?? 1);
    if ('reason' in result) throw new ConflictException(result);
    return result;
  }

  @Post('triggers/:triggerId/poll')
  async pollTrigger(
    @Param('triggerId') triggerId: string,
    @Body() body: { dueAt?: string },
  ) {
    const result = await this.triggers.poll(
      triggerId,
      body?.dueAt ?? new Date().toISOString(),
    );
    if ('reason' in result) throw new ConflictException(result);
    return result;
  }
}
