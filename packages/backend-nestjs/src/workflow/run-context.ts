import { Injectable } from '@nestjs/common';
import { ConnectionCryptoService } from '../connections/connection-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { toAppCredential } from './app-credential';
import type { RunContext } from './context.types';
import type { AppCredential } from './credential.types';
import { createStore } from './store-adapter';
import { withSpan } from '../telemetry/tracing';

interface BuildContextInput {
  workflowId: string;
  nodeId: string;
  runId?: string;
  connectionId?: string | null;
  inputs: Record<string, unknown>;
}

@Injectable()
export class RunContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: ConnectionCryptoService,
  ) {}

  async build(input: BuildContextInput): Promise<RunContext> {
    return withSpan(
      'RunContextService.build',
      {
        'workflow.id': input.workflowId,
        'node.id': input.nodeId,
        'run.id': input.runId ?? '',
      },
      () => this.buildInner(input),
    );
  }

  private async buildInner(input: BuildContextInput): Promise<RunContext> {
    let credential: AppCredential | undefined;

    if (input.connectionId) {
      const connection = await this.prisma.connection.findUniqueOrThrow({
        where: { id: input.connectionId },
      });
      credential = toAppCredential(
        connection,
        this.crypto.decrypt(connection.credentialsEnc),
      );
    }

    return {
      inputs: input.inputs,
      runId: input.runId,
      nodeId: input.nodeId,
      credential,
      store: createStore(this.prisma, input.workflowId, input.nodeId),
    };
  }
}
