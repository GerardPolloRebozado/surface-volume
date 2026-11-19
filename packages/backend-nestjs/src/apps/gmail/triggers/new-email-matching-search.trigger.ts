import type {
  PollingTrigger,
  RunContext,
  TriggerEvent,
} from '../../../workflow';
import { getAccessToken, getMessage, listMessageIds } from '../gmail.client';
import { emailOutputFields, emailSample } from '../gmail.outputs';
import { toEmailEvent } from '../gmail.parse';

/** Re-scan window (seconds) covering Gmail indexing lag and `after:` granularity. */
export const OVERLAP_SEC = 300;
const MAX_PAGES = 5;
const LAST_CHECK_KEY = 'last_check';
const SEEN_KEY = 'seen';

type Inputs = { query: string };
/** message id -> internalDate (epoch seconds) */
type SeenMap = Record<string, number>;

function readQuery(ctx: RunContext<Inputs>): string {
  return String(ctx.inputs?.query ?? '').trim();
}

export const newEmailMatchingSearch: PollingTrigger = {
  key: 'new_email_matching_search',
  name: 'New email matching search',
  description:
    'Fires when a new email arrives that matches a Gmail search query.',
  type: 'polling',
  defaultIntervalSec: 60,
  inputFields: [
    {
      key: 'query',
      label: 'Search query',
      type: 'string',
      required: true,
      helpText:
        'Gmail search syntax, e.g. from:boss@company.com has:attachment',
    },
  ],
  outputFields: emailOutputFields,
  sample: emailSample,

  async poll(ctx: RunContext<Inputs>): Promise<TriggerEvent[]> {
    const token = getAccessToken(ctx);
    const query = readQuery(ctx);
    const now = Math.floor(Date.now() / 1000);
    const lastCheck = await ctx.store.get<number>(LAST_CHECK_KEY);

    // First run: record a baseline, fire nothing.
    if (lastCheck === undefined) {
      const ids = await listMessageIds(token, query, 1);
      const seen: SeenMap = Object.fromEntries(ids.map((id) => [id, now]));
      await ctx.store.set(SEEN_KEY, seen);
      await ctx.store.set(LAST_CHECK_KEY, now);
      return [];
    }

    const since = lastCheck - OVERLAP_SEC;
    const seen = (await ctx.store.get<SeenMap>(SEEN_KEY)) ?? {};
    const q = query ? `(${query}) after:${since}` : `after:${since}`;
    const ids = await listMessageIds(token, q, MAX_PAGES);
    const fresh = ids.filter((id) => !(id in seen));

    const messages = [];
    for (const id of fresh) messages.push(await getMessage(token, id));
    const events = messages
      .map(toEmailEvent)
      .sort((a, b) => a.occurredAt!.localeCompare(b.occurredAt!));

    // Only persist after every fetch succeeded, so a failed poll retries the window.
    const nextSeen: SeenMap = {};
    for (const [id, ts] of Object.entries(seen)) {
      if (ts >= since) nextSeen[id] = ts;
    }
    for (const m of messages) {
      nextSeen[m.id] = Math.floor(Number(m.internalDate ?? now * 1000) / 1000);
    }
    await ctx.store.set(SEEN_KEY, nextSeen);
    await ctx.store.set(LAST_CHECK_KEY, now);
    return events;
  },

  async test(ctx: RunContext<Inputs>): Promise<TriggerEvent[]> {
    const token = getAccessToken(ctx);
    const ids = await listMessageIds(token, readQuery(ctx), 1, 3);
    const messages = await Promise.all(ids.map((id) => getMessage(token, id)));
    return messages.map(toEmailEvent);
  },
};
