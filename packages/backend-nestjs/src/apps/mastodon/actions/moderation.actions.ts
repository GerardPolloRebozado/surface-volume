import type { ActionDefinition } from '../../../workflow';
import {
  contextCredential,
  idempotencyKey,
  request,
} from '../mastodon.client';
import { accountOutputFields, accountSample } from '../mastodon.outputs';
import { stringValue } from './status.actions';

type Ctx = {
  inputs: Record<string, unknown>;
  credential?: { credentials: Record<string, unknown> };
  runId?: string;
  nodeId?: string;
};

function planFor(ctx: Ctx, id: string, path: string, body?: Record<string, unknown>) {
  const credential = contextCredential(ctx as never);
  return {
    calls: [
      {
        id,
        method: 'POST' as const,
        url: `${credential.instanceUrl}${path}`,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${credential.accessToken}`,
          'Idempotency-Key': idempotencyKey(ctx.runId, ctx.nodeId),
        },
        body,
        outputs: {
          id: '$.id',
          acct: '$.acct',
          displayName: '$.display_name',
          followers: '$.followers_count',
          statuses: '$.statuses_count',
        },
      },
    ],
  };
}

async function runCall(ctx: Ctx, path: string, body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const credential = contextCredential(ctx as never);
  return request<Record<string, unknown>>(credential, path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Idempotency-Key': idempotencyKey(ctx.runId, ctx.nodeId) },
  });
}

const accountIdField = {
  key: 'id',
  label: 'Account id',
  type: 'string' as const,
  required: true,
  helpText: 'Use an output reference, e.g. {{ trigger.accountId }}',
};

function accountAction(key: string, name: string, description: string, suffix: string): ActionDefinition {
  return {
    key,
    name,
    description,
    inputFields: [accountIdField],
    outputFields: accountOutputFields,
    sample: accountSample,
    plan(ctx) {
      return planFor(ctx, key, `/api/v1/accounts/${encodeURIComponent(stringValue(ctx.inputs.id))}/${suffix}`);
    },
    run(ctx) {
      return runCall(ctx, `/api/v1/accounts/${encodeURIComponent(stringValue(ctx.inputs.id))}/${suffix}`);
    },
  };
}

export const muteAccount = accountAction(
  'mute_account',
  'Mute an account',
  'Hides an account from your timelines and notifications.',
  'mute',
);

export const unmuteAccount = accountAction(
  'unmute_account',
  'Unmute an account',
  'Restores an account you previously muted.',
  'unmute',
);

export const blockAccount = accountAction(
  'block_account',
  'Block an account',
  'Blocks an account from interacting with you.',
  'block',
);

export const unblockAccount = accountAction(
  'unblock_account',
  'Unblock an account',
  'Removes a block from an account.',
  'unblock',
);

export const reportAccount: ActionDefinition = {
  key: 'report_account',
  name: 'Report an account',
  description: 'Sends a report to your instance moderators.',
  inputFields: [
    accountIdField,
    {
      key: 'comment',
      label: 'Reason',
      type: 'text',
      required: true,
      helpText: 'Explain what happened to the moderators.',
    },
    {
      key: 'statusIds',
      label: 'Status ids',
      type: 'string',
      helpText: 'Optional comma-separated status ids to include in the report.',
    },
  ],
  outputFields: [
    { key: 'id', label: 'Report id', type: 'string' },
    { key: 'comment', label: 'Reason', type: 'text' },
  ],
  sample: { id: '7', comment: 'Spam' },
  plan(ctx) {
    const body: Record<string, unknown> = {
      account_id: stringValue(ctx.inputs.id),
      comment: stringValue(ctx.inputs.comment),
    };
    const ids = stringValue(ctx.inputs.statusIds)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (ids.length > 0) body.status_ids = ids;

    const credential = contextCredential(ctx as never);
    return {
      calls: [
        {
          id: 'report',
          method: 'POST',
          url: `${credential.instanceUrl}/api/v1/reports`,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${credential.accessToken}`,
            'Idempotency-Key': idempotencyKey(ctx.runId, ctx.nodeId),
          },
          body,
          outputs: { id: '$.id', comment: '$.comment' },
        },
      ],
    };
  },
  run(ctx) {
    const body: Record<string, unknown> = {
      account_id: stringValue(ctx.inputs.id),
      comment: stringValue(ctx.inputs.comment),
    };
    const ids = stringValue(ctx.inputs.statusIds)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (ids.length > 0) body.status_ids = ids;
    const credential = contextCredential(ctx as never);
    return request<Record<string, unknown>>(credential, '/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Idempotency-Key': idempotencyKey(ctx.runId, ctx.nodeId) },
    });
  },
};
