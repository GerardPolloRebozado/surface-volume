import type { ActionDefinition } from '../../../workflow';
import { ActionError } from '../../../workflow';
import {
  contextCredential,
  idempotencyKey,
  request,
} from '../mastodon.client';
import { statusOutputFields, statusSample } from '../mastodon.outputs';

export function stringValue(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

type Ctx = {
  inputs: Record<string, unknown>;
  credential?: { credentials: Record<string, unknown> };
  runId?: string;
  nodeId?: string;
};

function planFor(
  ctx: Ctx,
  call: { id: string; method: 'POST' | 'DELETE'; path: string; body?: Record<string, unknown>; outputs: Record<string, string> },
) {
  const credential = contextCredential(ctx as never);
  return {
    calls: [
      {
        id: call.id,
        method: call.method,
        url: `${credential.instanceUrl}${call.path}`,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${credential.accessToken}`,
          'Idempotency-Key': idempotencyKey(ctx.runId, ctx.nodeId),
        },
        body: call.body,
        outputs: call.outputs,
      },
    ],
  };
}

async function runCall(ctx: Ctx, path: string, method: 'POST' | 'DELETE', body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const credential = contextCredential(ctx as never);
  return request<Record<string, unknown>>(credential, path, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Idempotency-Key': idempotencyKey(ctx.runId, ctx.nodeId) },
  });
}

const idField = {
  key: 'id',
  label: 'Status id',
  type: 'string' as const,
  required: true,
  helpText: 'Use a reference from an earlier step, e.g. {{ trigger.statusId }}',
};

function statusAction(
  key: string,
  name: string,
  description: string,
  suffix: string,
  method: 'POST' | 'DELETE' = 'POST',
): ActionDefinition {
  return {
    key,
    name,
    description,
    inputFields: [idField],
    outputFields: statusOutputFields,
    sample: statusSample,
    plan(ctx) {
      return planFor(ctx, {
        id: key,
        method,
        path: `/api/v1/statuses/${encodeURIComponent(stringValue(ctx.inputs.id))}${suffix}`,
        outputs: { id: '$.id', url: '$.url', createdAt: '$.created_at' },
      });
    },
    run(ctx) {
      return runCall(ctx, `/api/v1/statuses/${encodeURIComponent(stringValue(ctx.inputs.id))}${suffix}`, method);
    },
  };
}

export const deleteStatus = statusAction(
  'delete_status',
  'Delete a status',
  'Permanently removes one of your statuses.',
  '',
  'DELETE',
);

export const bookmarkStatus = statusAction(
  'bookmark_status',
  'Bookmark a status',
  'Adds a status to your bookmarks.',
  '/bookmark',
);

export const unbookmarkStatus = statusAction(
  'unbookmark_status',
  'Remove bookmark',
  'Removes a status from your bookmarks.',
  '/unbookmark',
);

export const pinStatus = statusAction(
  'pin_status',
  'Pin a status',
  'Pins one of your statuses to your profile.',
  '/pin',
);

export const unpinStatus = statusAction(
  'unpin_status',
  'Unpin a status',
  'Unpins a status from your profile.',
  '/unpin',
);

export const postPoll: ActionDefinition = {
  key: 'post_poll',
  name: 'Post a poll',
  description: 'Publishes a status with a poll attached.',
  inputFields: [
    {
      key: 'status',
      label: 'Question',
      type: 'text',
      required: true,
      helpText: 'The text shown above the poll options.',
    },
    {
      key: 'options',
      label: 'Options',
      type: 'string',
      required: true,
      helpText: 'Separate options with commas. Between 2 and 4 options are allowed.',
    },
    {
      key: 'expiresIn',
      label: 'Duration (seconds)',
      type: 'number',
      default: 86400,
      helpText: 'How long the poll stays open, in seconds.',
    },
    { key: 'multiple', label: 'Multiple choices', type: 'boolean' },
  ],
  outputFields: statusOutputFields,
  sample: statusSample,

  plan(ctx) {
    const options = stringValue(ctx.inputs.options)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (options.length < 2) throw new ActionError('A poll needs at least two options', 'fatal');

    const poll: Record<string, unknown> = {
      options,
      expires_in: Number(ctx.inputs.expiresIn) || 86400,
    };
    if (ctx.inputs.multiple === true || ctx.inputs.multiple === 'true') poll.multiple = true;

    const credential = contextCredential(ctx as never);
    return {
      calls: [
        {
          id: 'poll',
          method: 'POST',
          url: `${credential.instanceUrl}/api/v1/statuses`,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${credential.accessToken}`,
            'Idempotency-Key': idempotencyKey(ctx.runId, ctx.nodeId),
          },
          body: { status: stringValue(ctx.inputs.status), poll },
          outputs: { id: '$.id', url: '$.url', createdAt: '$.created_at' },
        },
      ],
    };
  },

  run(ctx) {
    const options = stringValue(ctx.inputs.options)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (options.length < 2) throw new ActionError('A poll needs at least two options', 'fatal');
    const poll: Record<string, unknown> = {
      options,
      expires_in: Number(ctx.inputs.expiresIn) || 86400,
    };
    if (ctx.inputs.multiple === true || ctx.inputs.multiple === 'true') poll.multiple = true;
    const credential = contextCredential(ctx as never);
    return request<Record<string, unknown>>(credential, '/api/v1/statuses', {
      method: 'POST',
      body: JSON.stringify({ status: stringValue(ctx.inputs.status), poll }),
      headers: { 'Idempotency-Key': idempotencyKey(ctx.runId, ctx.nodeId) },
    });
  },
};
