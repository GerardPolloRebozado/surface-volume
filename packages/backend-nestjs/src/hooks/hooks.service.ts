import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { findTrigger } from '../apps';
import { ConnectionCryptoService } from '../connections/connection-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import type { PlannerWindow } from '../workflow/planner';
import { RunContextService } from '../workflow/run-context';
import type {
  IncomingWebhook,
  WebhookTrigger,
} from '../workflow/triggers.types';
import { TriggersService } from '../triggers/triggers.service';
import { withSpan } from '../telemetry/tracing';

interface WebhookRequest {
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  rawBody?: Buffer;
}

@Injectable()
export class HooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexts: RunContextService,
    private readonly triggers: TriggersService,
    private readonly crypto: ConnectionCryptoService,
  ) {}

  async receive(
    token: string,
    request: WebhookRequest,
  ): Promise<{ status: number; body: unknown } | undefined> {
    return withSpan(
      'HooksService.receive',
      { 'http.request.method': request.method },
      () => this.receiveInner(token, request),
    );
  }

  private async receiveInner(
    token: string,
    request: WebhookRequest,
  ): Promise<{ status: number; body: unknown } | undefined> {
    const trigger = await this.prisma.workflowTrigger.findUnique({
      where: { webhookToken: token },
    });
    if (!trigger || !trigger.enabled) throw new NotFoundException();

    const definition = findTrigger(trigger.appId, trigger.triggerKey);
    if (!definition || definition.type !== 'webhook')
      throw new NotFoundException();
    const webhook = definition as WebhookTrigger;

    const incoming: IncomingWebhook = {
      workflowId: trigger.workflowId,
      method: request.method,
      headers: request.headers,
      query: request.query,
      rawBody:
        request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {})),
      body: request.body,
      receivedAt: new Date().toISOString(),
    };

    const handshake = webhook.handshake?.(incoming);
    if (handshake) return handshake;

    let signingSecret: string | undefined;
    if (trigger.webhookSecretEnc) {
      const secret = this.crypto.decrypt(trigger.webhookSecretEnc);
      signingSecret =
        typeof secret.secret === 'string' ? secret.secret : undefined;
    }
    if (
      webhook.verify &&
      !(await webhook.verify(incoming, { signingSecret }))
    ) {
      throw new UnauthorizedException();
    }

    const context = await this.contexts.build({
      workflowId: trigger.workflowId,
      nodeId: 'trigger',
      connectionId: trigger.connectionId,
      inputs: trigger.inputs as Record<string, unknown>,
    });

    const events = await webhook.parse(incoming, context);
    const version = await this.prisma.workflowVersion.findUniqueOrThrow({
      where: { id: trigger.versionId },
    });
    await this.triggers.ingestEvents(
      trigger,
      events,
      version.definition as unknown as PlannerWindow,
    );

    return undefined;
  }
}
