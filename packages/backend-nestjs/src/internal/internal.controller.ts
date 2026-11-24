import { Public } from '@nestjs/authentication';
import {
  Body,
  ConflictException,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  TriggersService,
  type PollSubmit,
} from '../triggers/triggers.service';
import { InternalGuard } from './internal.guard';
import { StepRunnerService, type StepResultBody } from './step-runner.service';

@Public()
@Controller('internal')
@UseGuards(InternalGuard)
export class InternalController {
  constructor(
    private readonly steps: StepRunnerService,
    private readonly triggers: TriggersService,
  ) {}

  @Post('steps/:stepId/claim')
  async claimStep(
    @Param('stepId') stepId: string,
    @Body() body: { attempt?: number },
  ) {
    const result = await this.steps.claim(stepId, body?.attempt ?? 1);
    if ('reason' in result) throw new ConflictException(result);
    return result;
  }

  @Post('steps/:stepId/result')
  async finishStep(
    @Param('stepId') stepId: string,
    @Body() body: StepResultBody & { attempt?: number },
  ) {
    const result = await this.steps.result(stepId, body?.attempt ?? 1, body);
    if ('reason' in result) throw new ConflictException(result);
    return result;
  }

  @Post('triggers/:triggerId/poll/claim')
  async claimPoll(
    @Param('triggerId') triggerId: string,
    @Body() body: { dueAt?: string },
  ) {
    const result = await this.triggers.claim(
      triggerId,
      body?.dueAt ?? new Date().toISOString(),
    );
    if ('reason' in result) throw new ConflictException(result);
    return result;
  }

  @Post('triggers/:triggerId/poll/submit')
  async submitPoll(
    @Param('triggerId') triggerId: string,
    @Body() body: PollSubmit & { dueAt?: string },
  ) {
    const result = await this.triggers.submit(
      triggerId,
      body?.dueAt ?? new Date().toISOString(),
      body,
    );
    if ('reason' in result) throw new ConflictException(result);
    return result;
  }
}
