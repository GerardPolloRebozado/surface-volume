import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE } from '../queue/queue.constants';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectQueue(QUEUE) private readonly workflowQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  onApplicationBootstrap() {}
}
