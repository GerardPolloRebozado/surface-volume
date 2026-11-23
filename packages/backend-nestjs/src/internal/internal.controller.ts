import { Public } from '@nestjs/authentication';
import {
  Body,
  ConflictException,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InternalGuard } from './internal.guard';
import { StepRunnerService } from './step-runner.service';

@Public()
@Controller('internal')
@UseGuards(InternalGuard)
export class InternalController {
  constructor(private readonly steps: StepRunnerService) {}

  @Post('steps/:stepId/run')
  async runStep(
    @Param('stepId') stepId: string,
    @Body() body: { attempt?: number },
  ) {
    const result = await this.steps.run(stepId, body?.attempt ?? 1);
    if ('reason' in result) throw new ConflictException(result);
    return result;
  }
}
