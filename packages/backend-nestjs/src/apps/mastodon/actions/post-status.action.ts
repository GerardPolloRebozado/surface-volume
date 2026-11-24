import type { ActionDefinition } from '../../../workflow';
import { statusSample, statusOutputFields } from '../mastodon.outputs';
import {
  contextCredential,
  idempotencyKey,
  postStatus,
  statusBody,
  type PostStatusInput,
} from '../mastodon.client';

function input(ctx: { inputs: Record<string, unknown> }): PostStatusInput {
  const values = ctx.inputs ?? {};
  const read = (key: string): string | undefined => {
    const value = values[key];
    return value === undefined || value === null || value === ''
      ? undefined
      : String(value);
  };
  return {
    status: read('status') ?? '',
    visibility: read('visibility'),
    language: read('language'),
    spoilerText: read('spoilerText'),
    inReplyToId: read('inReplyToId'),
  };
}

export const postStatusAction: ActionDefinition = {
  key: 'post_status',
  name: 'Post a status',
  description: 'Publishes a text status on the connected Mastodon account.',
  inputFields: [
    {
      key: 'status',
      label: 'Status text',
      type: 'text',
      required: true,
      helpText: 'Use {{ trigger.statusContent }} to reference an earlier node.',
    },
    {
      key: 'visibility',
      label: 'Visibility',
      type: 'select',
      default: 'public',
      choices: [
        { value: 'public', label: 'Public' },
        { value: 'unlisted', label: 'Unlisted' },
        { value: 'private', label: 'Followers only' },
        { value: 'direct', label: 'Direct' },
      ],
    },
    { key: 'language', label: 'Language code', type: 'string' },
    { key: 'spoilerText', label: 'Content warning', type: 'string' },
    { key: 'inReplyToId', label: 'Reply to status id', type: 'string' },
  ],
  outputFields: statusOutputFields,
  sample: statusSample,

  plan(ctx) {
    const credential = contextCredential(ctx);
    const key = idempotencyKey(ctx.runId, ctx.nodeId);
    return {
      calls: [
        {
          id: 'status',
          method: 'POST',
          url: `${credential.instanceUrl}/api/v1/statuses`,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${credential.accessToken}`,
            'Idempotency-Key': key,
          },
          body: statusBody(input(ctx)),
          outputs: {
            id: '$.id',
            url: '$.url',
            createdAt: '$.created_at',
          },
        },
      ],
    };
  },

  async run(ctx) {
    const created = await postStatus(
      contextCredential(ctx),
      input(ctx),
      idempotencyKey(ctx.runId, ctx.nodeId),
    );
    return {
      id: created.id,
      url: created.url,
      createdAt: created.created_at,
    };
  },
};
