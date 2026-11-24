import { favouriteStatus, createList, followAccount } from './actions/social.actions';
import { newStatus } from './triggers/timeline.triggers';

const context = {
  inputs: { id: '123', title: 'Friends', accountId: '42' },
  runId: 'run-1',
  nodeId: 'step-1',
  credential: {
    credentials: {
      instanceUrl: 'https://mastodon.social',
      accessToken: 'token',
    },
  },
};

describe('additional mastodon nodes', () => {
  it('plans status and account mutations with an idempotency key', () => {
    const favourite = favouriteStatus.plan!(context as never) as {
      calls: { url: string; headers: Record<string, string> }[];
    };
    expect(favourite.calls[0].url).toBe('https://mastodon.social/api/v1/statuses/123/favourite');
    expect(favourite.calls[0].headers['Idempotency-Key']).toBe('run-1:step-1');

    const follow = followAccount.plan!(context as never) as {
      calls: { url: string }[];
    };
    expect(follow.calls[0].url).toBe('https://mastodon.social/api/v1/accounts/123/follow');

    const list = createList.plan!(context as never) as {
      calls: { body: Record<string, unknown> }[];
    };
    expect(list.calls[0].body).toEqual({ title: 'Friends' });
  });

  it('polls the home timeline with a cursor', async () => {
    const memory: Record<string, unknown> = {};
    const ctx = {
      inputs: {},
      credential: context.credential,
      store: {
        get: async <T>(key: string) => memory[key] as T | undefined,
        set: async (key: string, value: unknown) => { memory[key] = value; },
        delete: async (key: string) => { delete memory[key]; },
      },
    };
    const plan = await newStatus.plan!(ctx as never);
    const url = new URL(plan.calls[0].url);
    expect(url.pathname).toBe('/api/v1/timelines/home');
    expect(url.searchParams.get('since_id')).toBeNull();

    expect(await newStatus.map!({ items: [{ id: '10' }] }, ctx as never)).toEqual([]);
    expect(memory['timeline:seen']).toBe('10');

    const events = await newStatus.map!(
      {
        items: [
          {
            id: '11',
            created_at: '2026-11-24T10:00:00Z',
            content: '<p>hello</p>',
            url: 'https://mastodon.social/@a/11',
            account: { acct: 'a@mastodon.social' },
          },
        ],
      },
      ctx as never,
    );
    expect(events).toHaveLength(1);
    expect(events[0].data.account).toBe('a@mastodon.social');
  });
});
