import { deleteStatus, postPoll, bookmarkStatus } from './actions/status.actions';
import { muteAccount, reportAccount } from './actions/moderation.actions';
import { newMention, newDirectMessage } from './triggers/notification.triggers';

const context = {
  inputs: {
    id: '123',
    status: 'Which one?',
    options: 'A, B, C',
    comment: 'Spam account',
  },
  runId: 'run-1',
  nodeId: 'step-1',
  credential: {
    credentials: {
      instanceUrl: 'https://mastodon.social',
      accessToken: 'token',
    },
  },
};

describe('advanced mastodon nodes', () => {
  it('plans status mutations', () => {
    const del = deleteStatus.plan!(context as never) as { calls: { method: string; url: string }[] };
    expect(del.calls[0].method).toBe('DELETE');
    expect(del.calls[0].url).toBe('https://mastodon.social/api/v1/statuses/123');

    const bookmark = bookmarkStatus.plan!(context as never) as { calls: { url: string }[] };
    expect(bookmark.calls[0].url).toBe('https://mastodon.social/api/v1/statuses/123/bookmark');
  });

  it('builds nested poll bodies', () => {
    const plan = postPoll.plan!(context as never) as {
      calls: { body: { status: string; poll: { options: string[]; expires_in: number } } }[];
    };
    expect(plan.calls[0].body.status).toBe('Which one?');
    expect(plan.calls[0].body.poll.options).toEqual(['A', 'B', 'C']);
    expect(plan.calls[0].body.poll.expires_in).toBe(86400);
  });

  it('plans moderation actions', () => {
    const mute = muteAccount.plan!(context as never) as { calls: { url: string }[] };
    expect(mute.calls[0].url).toBe('https://mastodon.social/api/v1/accounts/123/mute');

    const report = reportAccount.plan!(context as never) as {
      calls: { url: string; body: Record<string, unknown> }[];
    };
    expect(report.calls[0].url).toBe('https://mastodon.social/api/v1/reports');
    expect(report.calls[0].body.account_id).toBe('123');
    expect(report.calls[0].body.comment).toBe('Spam account');
  });

  it('polls filtered notifications and direct messages', async () => {
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
    const mention = await newMention.plan!(ctx as never);
    expect(mention.calls[0].url).toContain('types%5B%5D=mention');

    const direct = await newDirectMessage.plan!(ctx as never);
    expect(direct.calls[0].url).toContain('/api/v1/timelines/direct');
  });
});
