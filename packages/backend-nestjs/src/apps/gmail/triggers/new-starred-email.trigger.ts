import type {
  PollingPlan,
  PollingTrigger,
  RunContext,
  TriggerEvent,
} from '../../../workflow';
import {
  getAccessToken,
  getMessage,
  listAllMessageIds,
} from '../gmail.client';
import { emailOutputFields, emailSample } from '../gmail.outputs';
import { toEmailEvent } from '../gmail.parse';

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const STARRED_KEY = 'starred';
const STARRED_QUERY = 'is:starred';
export const STARRED_PAGE_SIZE = 500;
export const STARRED_MAX_PAGES = 5;

export const newStarredEmail: PollingTrigger = {
  key: 'new_starred_email',
  name: 'New starred email',
  description: 'Fires when you star an email in Gmail.',
  type: 'polling',
  defaultIntervalSec: 60,
  inputFields: [],
  outputFields: emailOutputFields,
  sample: { ...emailSample, labels: ['INBOX', 'STARRED'] },

  plan(ctx: RunContext): PollingPlan {
    const token = getAccessToken(ctx);
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };

    return {
      calls: [
        {
          id: 'list',
          method: 'GET',
          url: `${BASE}/messages?q=is%3Astarred&maxResults=500`,
          headers,
          outputs: { ids: '$.messages[*].id' },
        },
        {
          id: 'message',
          forEach: 'ids',
          as: 'id',
          method: 'GET',
          url: `${BASE}/messages/{{ id }}?format=full`,
          headers,
          outputs: { messages: '$' },
        },
      ],
    };
  },

  async poll(ctx: RunContext): Promise<TriggerEvent[]> {
    const token = getAccessToken(ctx);
    const { ids, complete } = await listAllMessageIds(
      token,
      STARRED_QUERY,
      STARRED_MAX_PAGES,
      STARRED_PAGE_SIZE,
    );
    const stored = await ctx.store.get<string[]>(STARRED_KEY);

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

    const next = complete ? ids : [...new Set([...stored, ...ids])];
    await ctx.store.set(STARRED_KEY, next);
    return events;
  },

  async map(
    outputs: Record<string, unknown>,
    ctx: RunContext,
  ): Promise<TriggerEvent[]> {
    const messages = Array.isArray(outputs.messages)
      ? (outputs.messages as Parameters<typeof toEmailEvent>[0][])
      : [];
    const stored = await ctx.store.get<string[]>(STARRED_KEY);
    const ids = messages.map((message) => message.id);

    if (stored === undefined) {
      await ctx.store.set(STARRED_KEY, ids);
      return [];
    }

    const known = new Set(stored);
    const events = messages
      .filter((message) => !known.has(message.id))
      .map(toEmailEvent)
      .sort((a, b) => a.occurredAt!.localeCompare(b.occurredAt!));

    await ctx.store.set(STARRED_KEY, [...new Set([...stored, ...ids])]);
    return events;
  },

  async test(ctx: RunContext): Promise<TriggerEvent[]> {
    const token = getAccessToken(ctx);
    const response = await fetch(
      `${BASE}/messages?q=is%3Astarred&maxResults=3`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = (await response.json()) as { messages?: { id: string }[] };
    const events: TriggerEvent[] = [];
    for (const item of body.messages ?? []) {
      const message = await fetch(
        `${BASE}/messages/${item.id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      events.push(toEmailEvent((await message.json()) as Parameters<typeof toEmailEvent>[0]));
    }
    return events;
  },
};
