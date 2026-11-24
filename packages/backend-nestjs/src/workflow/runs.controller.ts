import { CurrentUser } from '@nestjs/authentication';
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class RunsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('runs')
  async all(@CurrentUser() user: { id: string }) {
    return this.prisma.workflowRun.findMany({
      where: { userId: user.id },
      include: { workflow: { select: { name: true } } },
      orderBy: { queuedAt: 'desc' },
      take: 100,
    });
  }

  @Get('workflows/:id/runs')
  async list(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.prisma.workflowRun.findMany({
      where: { workflowId: id, userId: user.id },
      orderBy: { queuedAt: 'desc' },
      take: 50,
    });
  }

  @Get('runs/:id')
  async detail(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id, userId: user.id },
      include: { steps: { orderBy: { seq: 'asc' } } },
    });
    if (!run) throw new NotFoundException();
    return run;
  }
}
