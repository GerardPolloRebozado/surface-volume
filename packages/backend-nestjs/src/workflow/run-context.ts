import { Injectable } from '@nestjs/common';
import { ConnectionCryptoService } from '../connections/connection-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { toAppCredential } from './app-credential';
import type { RunContext } from './context.types';
import type { AppCredential } from './credential.types';
import { createStore } from './store-adapter';

interface BuildContextInput {
  workflowId: string;
  nodeId: string;
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
      credential,
      store: createStore(this.prisma, input.workflowId, input.nodeId),
    };
  }
}
