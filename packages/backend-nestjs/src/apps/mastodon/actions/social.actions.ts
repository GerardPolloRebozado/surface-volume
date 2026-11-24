import type { ActionDefinition } from '../../../workflow';
import { ActionError } from '../../../workflow';
import {
  contextCredential,
  idempotencyKey,
  request,
} from '../mastodon.client';
import {
  accountOutputFields,
  accountSample,
  statusOutputFields,
  statusSample,
} from '../mastodon.outputs';

function str(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

const idField = {
  key: 'id',
  label: 'Status or account id',
  type: 'string' as const,
  required: true,
  helpText: 'Use a reference from an earlier step, e.g. {{ trigger.statusId }}',
};

function planFor(
  ctx: { credential?: { credentials: Record<string, unknown> }; runId?: string; nodeId?: string },
  call: { id: string; method: 'POST' | 'PATCH'; path: string; body?: Record<string, unknown>; outputs: Record<string, string> },
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

async function runCall(
  ctx: { credential?: { credentials: Record<string, unknown> }; runId?: string; nodeId?: string; inputs: Record<string, unknown> },
  path: string,
  method: 'POST' | 'PATCH',
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const credential = contextCredential(ctx as never);
  const result = await request<Record<string, unknown>>(credential, path, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Idempotency-Key': idempotencyKey(ctx.runId, ctx.nodeId) },
  });
  return result;
}

export const favouriteStatus: ActionDefinition = {
  key: 'favourite_status',
  name: 'Favourite a status',
  description: 'Adds a heart to a status.',
  inputFields: [idField],
  outputFields: statusOutputFields,
  sample: statusSample,
  plan(ctx) {
    return planFor(ctx, {
      id: 'favourite',
      method: 'POST',
      path: `/api/v1/statuses/${encodeURIComponent(str(ctx.inputs.id))}/favourite`,
      outputs: { id: '$.id', url: '$.url', createdAt: '$.created_at' },
    });
  },
  run(ctx) {
    return runCall(ctx, `/api/v1/statuses/${encodeURIComponent(str(ctx.inputs.id))}/favourite`, 'POST');
  },
};

export const reblogStatus: ActionDefinition = {
  key: 'reblog_status',
  name: 'Boost a status',
  description: 'Reblogs a status to your followers.',
  inputFields: [idField],
  outputFields: statusOutputFields,
  sample: statusSample,
  plan(ctx) {
    return planFor(ctx, {
      id: 'reblog',
      method: 'POST',
      path: `/api/v1/statuses/${encodeURIComponent(str(ctx.inputs.id))}/reblog`,
      outputs: { id: '$.id', url: '$.url', createdAt: '$.created_at' },
    });
  },
  run(ctx) {
    return runCall(ctx, `/api/v1/statuses/${encodeURIComponent(str(ctx.inputs.id))}/reblog`, 'POST');
  },
};

export const followAccount: ActionDefinition = {
  key: 'follow_account',
  name: 'Follow an account',
  description: 'Follows an account by its id.',
  inputFields: [{ ...idField, label: 'Account id' }],
  outputFields: accountOutputFields,
  sample: accountSample,
  plan(ctx) {
    return planFor(ctx, {
      id: 'follow',
      method: 'POST',
      path: `/api/v1/accounts/${encodeURIComponent(str(ctx.inputs.id))}/follow`,
      outputs: {
        id: '$.id',
        acct: '$.acct',
        displayName: '$.display_name',
        followers: '$.followers_count',
        statuses: '$.statuses_count',
      },
    });
  },
  run(ctx) {
    return runCall(ctx, `/api/v1/accounts/${encodeURIComponent(str(ctx.inputs.id))}/follow`, 'POST');
  },
};

export const createList: ActionDefinition = {
  key: 'create_list',
  name: 'Create a list',
  description: 'Creates a new list on your account.',
  inputFields: [
    { key: 'title', label: 'List title', type: 'string', required: true },
    {
      key: 'repliesPolicy',
      label: 'Replies',
      type: 'select',
      choices: [
        { value: 'followed', label: 'People I follow' },
        { value: 'list', label: 'People in this list' },
        { value: 'none', label: 'Nobody' },
      ],
    },
  ],
  outputFields: [
    { key: 'id', label: 'List id', type: 'string' },
    { key: 'title', label: 'Title', type: 'string' },
  ],
  sample: { id: '42', title: 'Friends' },
  plan(ctx) {
    const body: Record<string, unknown> = { title: str(ctx.inputs.title) };
    if (ctx.inputs.repliesPolicy) body.replies_policy = str(ctx.inputs.repliesPolicy);
    return planFor(ctx, {
      id: 'list',
      method: 'POST',
      path: '/api/v1/lists',
      body,
      outputs: { id: '$.id', title: '$.title' },
    });
  },
  run(ctx) {
    const body: Record<string, unknown> = { title: str(ctx.inputs.title) };
    if (ctx.inputs.repliesPolicy) body.replies_policy = str(ctx.inputs.repliesPolicy);
    return runCall(ctx, '/api/v1/lists', 'POST', body);
  },
};

export const addToList: ActionDefinition = {
  key: 'add_to_list',
  name: 'Add account to list',
  description: 'Adds one account to an existing list.',
  inputFields: [
    { key: 'listId', label: 'List id', type: 'string', required: true },
    { ...idField, label: 'Account id' },
  ],
  outputFields: [
    { key: 'id', label: 'List id', type: 'string' },
    { key: 'title', label: 'Title', type: 'string' },
  ],
  sample: { id: '42', title: 'Friends' },
  plan(ctx) {
    return planFor(ctx, {
      id: 'member',
      method: 'POST',
      path: `/api/v1/lists/${encodeURIComponent(str(ctx.inputs.listId))}/accounts`,
      body: { account_ids: [str(ctx.inputs.id)] },
      outputs: { id: '$.id', title: '$.title' },
    });
  },
  run(ctx) {
    return runCall(ctx, `/api/v1/lists/${encodeURIComponent(str(ctx.inputs.listId))}/accounts`, 'POST', {
      account_ids: [str(ctx.inputs.id)],
    });
  },
};

export const updateProfile: ActionDefinition = {
  key: 'update_profile',
  name: 'Update profile',
  description: 'Changes your display name and bio.',
  inputFields: [
    { key: 'displayName', label: 'Display name', type: 'string' },
    { key: 'note', label: 'Bio', type: 'text' },
  ],
  outputFields: accountOutputFields,
  sample: accountSample,
  plan(ctx) {
    const body: Record<string, unknown> = {};
    if (ctx.inputs.displayName) body.display_name = str(ctx.inputs.displayName);
    if (ctx.inputs.note) body.note = str(ctx.inputs.note);
    if (Object.keys(body).length === 0) {
      throw new ActionError('Set a display name or bio to update', 'fatal');
    }
    return planFor(ctx, {
      id: 'profile',
      method: 'PATCH',
      path: '/api/v1/accounts/update_credentials',
      body,
      outputs: {
        id: '$.id',
        acct: '$.acct',
        displayName: '$.display_name',
        followers: '$.followers_count',
        statuses: '$.statuses_count',
      },
    });
  },
  run(ctx) {
    const body: Record<string, unknown> = {};
    if (ctx.inputs.displayName) body.display_name = str(ctx.inputs.displayName);
    if (ctx.inputs.note) body.note = str(ctx.inputs.note);
    return runCall(ctx, '/api/v1/accounts/update_credentials', 'PATCH', body);
  },
};
