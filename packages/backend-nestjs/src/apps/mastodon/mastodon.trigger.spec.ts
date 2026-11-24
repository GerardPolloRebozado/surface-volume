import { newNotificationTrigger } from './triggers/new-notification.trigger';
import { NOTIFICATION_CURSOR } from './mastodon.parse';

function store(initial: Record<string, unknown> = {}) {
  const values = { ...initial };
  return {
    values,
    get: async <T>(key: string) => values[key] as T | undefined,
    set: async (key: string, value: unknown) => {
      values[key] = value;
    },
    delete: async (key: string) => {
      delete values[key];
    },
  };
}

function context(values: Record<string, unknown> = {}, initial: Record<string, unknown> = {}) {
  const memory = store(initial);
  return {
    ctx: {
      inputs: values,
      store: memory,
      credential: {
        credentials: {
          instanceUrl: 'https://mastodon.social',
          accessToken: 'token',
        },
      },
    },
    memory,
  };
}

describe('mastodon new_notification trigger', () => {
  it('builds a cursor-based poll plan', async () => {
    const { ctx } = context({ types: ['mention', 'reblog'] }, { [NOTIFICATION_CURSOR]: '100' });
    const plan = await newNotificationTrigger.plan!(ctx as never);
    const url = new URL(plan.calls[0].url);

    expect(url.pathname).toBe('/api/v1/notifications');
    expect(url.searchParams.get('since_id')).toBe('100');
    expect(url.searchParams.getAll('types[]')).toEqual(['mention', 'reblog']);
    expect(plan.calls[0].outputs).toEqual({ notifications: '$' });
  });

  it('seeds the cursor without emitting the backlog on the first poll', async () => {
    const { ctx, memory } = context();
    const events = await newNotificationTrigger.map!(
      { notifications: [{ id: '10', type: 'mention', created_at: '2026-11-24T10:00:00Z' }] },
      ctx as never,
    );

    expect(events).toEqual([]);
    expect(memory.values[NOTIFICATION_CURSOR]).toBe('10');
  });

  it('emits only newer notifications and advances the cursor', async () => {
    const { ctx, memory } = context({}, { [NOTIFICATION_CURSOR]: '10' });
    const events = await newNotificationTrigger.map!(
      {
        notifications: [
          {
            id: '12',
            type: 'mention',
            created_at: '2026-11-24T10:01:00Z',
            account: { acct: 'friend@mastodon.social' },
            status: { url: 'https://mastodon.social/@friend/12', content: '<p>hi</p>' },
          },
          { id: '9', type: 'follow', created_at: '2026-11-24T09:00:00Z' },
        ],
      },
      ctx as never,
    );

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('12');
    expect(events[0].data.account).toBe('friend@mastodon.social');
    expect(events[0].data.statusContent).toBe('<p>hi</p>');
    expect(memory.values[NOTIFICATION_CURSOR]).toBe('12');
  });
});
