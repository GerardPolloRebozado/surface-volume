import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { findApp } from '../apps';
import { PrismaService } from '../prisma/prisma.service';
import { ActionError } from '../workflow';
import { assertSafeBaseUrl } from './egress';
import { ConnectionCryptoService } from './connection-crypto.service';
import type { ConnectionResourceDto, ConnectionTestDto, CreateConnectionDto } from './connections.dto';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: ConnectionCryptoService,
  ) {}

  async list(userId: string): Promise<ConnectionResourceDto[]> {
    const rows = await this.prisma.connection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.resource(row));
  }

  async create(userId: string, dto: CreateConnectionDto): Promise<ConnectionResourceDto> {
    const app = findApp(dto.appId);
    if (!app) {
      throw new UnprocessableEntityException(`Unknown app ${dto.appId}`);
    }

    const credentials = { ...dto.credentials };
    if (typeof credentials.instanceUrl === 'string') {
      try {
        credentials.instanceUrl = assertSafeBaseUrl(credentials.instanceUrl);
      } catch (error) {
        throw new UnprocessableEntityException((error as Error).message);
      }
    }

    const fields = 'fields' in app.auth ? app.auth.fields : [];
    for (const field of fields) {
      const value = credentials[field.key];
      if (
        field.required &&
        (typeof value !== 'string' || value.trim().length === 0)
      ) {
        throw new UnprocessableEntityException(`${field.label} is required`);
      }
    }
    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value !== 'string') {
        throw new UnprocessableEntityException(`${key} must be a string`);
      }
      credentials[key] = value.trim();
    }

    let externalAccountId: string = randomUUID();
    let displayName = dto.displayName?.trim() || app.name;
    let scopes: string[] = [];
    if (app.verify) {
      const identity = await this.verify(app.verify, credentials);
      externalAccountId = identity.externalAccountId;
      displayName = dto.displayName?.trim() || identity.displayName;
      scopes = identity.scopes ?? [];
    }

    const duplicate = await this.prisma.connection.findFirst({
      where: { userId, appId: dto.appId, externalAccountId },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('This account is already connected');
    }

    const encrypted = this.crypto.encrypt(credentials);
    const created = await this.prisma.connection.create({
      data: {
        userId,
        appId: dto.appId,
        displayName,
        externalAccountId,
        authType: app.auth.type,
        credentialsEnc: new Uint8Array(encrypted.credentialsEnc),
        keyVersion: encrypted.keyVersion,
        scopes,
        status: 'active',
      },
    });

    return this.resource(created);
  }

  async test(userId: string, id: string): Promise<ConnectionTestDto> {
    const row = await this.own(userId, id);
    const app = findApp(row.appId);
    const credentials = this.decrypt(row);

    if (typeof credentials.instanceUrl === 'string') {
      try {
        credentials.instanceUrl = assertSafeBaseUrl(credentials.instanceUrl);
      } catch (error) {
        throw new UnprocessableEntityException((error as Error).message);
      }
    }

    if (!app?.verify) {
      return { ok: true, account: row.displayName };
    }

    try {
      const identity = await app.verify(credentials);
      await this.prisma.connection.update({
        where: { id },
        data: {
          status: 'active',
          lastError: null,
          lastRefreshedAt: new Date(),
          displayName: identity.displayName,
          scopes: identity.scopes ?? [],
        },
      });
      return { ok: true, account: identity.displayName, scopes: identity.scopes };
    } catch (error) {
      const message = this.message(error);
      await this.prisma.connection.update({
        where: { id },
        data: { status: 'error', lastError: message },
      });
      return { ok: false, account: row.displayName, message };
    }
  }

  async revoke(userId: string, id: string): Promise<void> {
    await this.own(userId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.connection.update({
        where: { id },
        data: { status: 'revoked', lastError: 'Disconnected by the user' },
      });
      const triggers = await tx.workflowTrigger.findMany({
        where: { connectionId: id },
        select: { workflowId: true },
      });
      await tx.workflowTrigger.updateMany({
        where: { connectionId: id },
        data: { enabled: false, nextRunAt: null, lastError: 'Connection revoked' },
      });
      const workflowIds = triggers.map((trigger) => trigger.workflowId);
      if (workflowIds.length > 0) {
        await tx.workflow.updateMany({
          where: { id: { in: workflowIds } },
          data: { status: 'error', statusReason: 'A connection was disconnected' },
        });
      }
    });
  }

  async markCredentialRejected(connectionId: string, message: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.connection.update({
        where: { id: connectionId },
        data: { status: 'error', lastError: message },
      });
      const triggers = await tx.workflowTrigger.findMany({
        where: { connectionId },
        select: { workflowId: true },
      });
      await tx.workflowTrigger.updateMany({
        where: { connectionId },
        data: { enabled: false, nextRunAt: null, lastError: message },
      });
      const workflowIds = triggers.map((trigger) => trigger.workflowId);
      if (workflowIds.length > 0) {
        await tx.workflow.updateMany({
          where: { id: { in: workflowIds } },
          data: { status: 'error', statusReason: message },
        });
      }
    });
  }

  private async verify(
    verify: NonNullable<ReturnType<typeof findApp>>['verify'],
    credentials: Record<string, unknown>,
  ) {
    try {
      return await verify(credentials);
    } catch (error) {
      throw new UnprocessableEntityException(this.message(error));
    }
  }

  private message(error: unknown): string {
    if (error instanceof ActionError || error instanceof Error) {
      return error.message;
    }
    return 'Could not verify the credentials';
  }

  private decrypt(row: { credentialsEnc: Uint8Array }) {
    return this.crypto.decrypt(row.credentialsEnc);
  }

  private async own(userId: string, id: string) {
    const row = await this.prisma.connection.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Connection not found');
    return row;
  }

  private resource(row: {
    id: string;
    appId: string;
    displayName: string;
    status: string;
    lastError: string | null;
  }): ConnectionResourceDto {
    return {
      id: row.id,
      appId: row.appId,
      appName: findApp(row.appId)?.name ?? row.appId,
      account: row.displayName,
      status: row.status,
      lastError: row.lastError,
    };
  }
}
