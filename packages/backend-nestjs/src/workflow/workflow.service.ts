import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectQueue('triggers-to-check') private readonly triggersToCheck: Queue,
    private readonly prisma: PrismaService,
  ) {}

  onApplicationBootstrap() {}
}
