import type {
  PollingTrigger,
  RunContext,
  TriggerEvent,
} from '../../../workflow';
import { getAccessToken, getMessage, listAllMessageIds } from '../gmail.client';
import { emailOutputFields, emailSample } from '../gmail.outputs';
import { toEmailEvent } from '../gmail.parse';

const STARRED_QUERY = 'is:starred';
/** Gmail's max page size; 5 pages covers up to 2,500 starred messages. */
export const STARRED_PAGE_SIZE = 500;
export const STARRED_MAX_PAGES = 5;
const STARRED_KEY = 'starred';

export const newStarredEmail: PollingTrigger = {
  key: 'new_starred_email',
  name: 'New starred email',
  description: 'Fires when you star an email in Gmail.',
  type: 'polling',
  defaultIntervalSec: 60,
  inputFields: [],
  outputFields: emailOutputFields,
  sample: { ...emailSample, labels: ['INBOX', 'STARRED'] },

  async poll(ctx: RunContext): Promise<TriggerEvent[]> {
    const token = getAccessToken(ctx);
    const { ids, complete } = await listAllMessageIds(
      token,
      STARRED_QUERY,
      STARRED_MAX_PAGES,
      STARRED_PAGE_SIZE,
    );
    const stored = await ctx.store.get<string[]>(STARRED_KEY);

    // First run: record the current starred set as a baseline, fire nothing.
    if (stored === undefined) {
      await ctx.store.set(STARRED_KEY, ids);
      return [];
    }

    const known = new Set(stored);
    const fresh = ids.filter((id) => !known.has(id));
    const messages = [];
    for (const id of fresh) messages.push(await getMessage(token, id));
    const events = messages
      .map(toEmailEvent)
      .sort((a, b) => a.occurredAt!.localeCompare(b.occurredAt!));

    // A complete listing replaces the set, so unstar + re-star fires again.
    // A truncated one can't tell "unstarred" from "past the page cap", so it
    // keeps old IDs to avoid re-firing them later.
    const next = complete ? ids : [...new Set([...stored, ...ids])];
    await ctx.store.set(STARRED_KEY, next);
    return events;
  },

  async test(ctx: RunContext): Promise<TriggerEvent[]> {
    const token = getAccessToken(ctx);
    const { ids } = await listAllMessageIds(token, STARRED_QUERY, 1, 3);
    const messages = await Promise.all(ids.map((id) => getMessage(token, id)));
    return messages.map(toEmailEvent);
  },
};
