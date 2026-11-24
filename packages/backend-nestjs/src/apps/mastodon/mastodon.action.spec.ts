import { postStatusAction } from './actions/post-status.action';

describe('mastodon post_status action', () => {
  const context = {
    inputs: {
      status: 'Thanks for the mention',
      visibility: 'public',
      spoilerText: 'spoiler',
    },
    runId: '0199a0c0-0000-7000-8000-000000000001',
    nodeId: 'reply',
    credential: {
      credentials: {
        instanceUrl: 'https://mastodon.social',
        accessToken: 'secret-token',
      },
    },
  };

  it('builds a single planned call with an idempotency key', () => {
    const plan = postStatusAction.plan!(context as never) as {
      calls: {
        id: string;
        method: string;
        url: string;
        headers: Record<string, string>;
        body: Record<string, unknown>;
        outputs: Record<string, string>;
      }[];
    };

    expect(plan.calls).toHaveLength(1);
    expect(plan.calls[0].method).toBe('POST');
    expect(plan.calls[0].url).toBe('https://mastodon.social/api/v1/statuses');
    expect(plan.calls[0].headers.Authorization).toBe('Bearer secret-token');
    expect(plan.calls[0].headers['Idempotency-Key']).toBe(
      '0199a0c0-0000-7000-8000-000000000001:reply',
    );
    expect(plan.calls[0].body).toEqual({
      status: 'Thanks for the mention',
      visibility: 'public',
      spoiler_text: 'spoiler',
    });
    expect(plan.calls[0].outputs).toEqual({
      id: '$.id',
      url: '$.url',
      createdAt: '$.created_at',
    });
  });

  it('keeps the token out of the inputs and the body', () => {
    const plan = postStatusAction.plan!(context as never) as {
      calls: { body: Record<string, unknown> }[];
    };
    expect(JSON.stringify(plan.calls[0].body)).not.toContain('secret-token');
    expect(JSON.stringify(context.inputs)).not.toContain('secret-token');
  });
});
