import type {
  GmailMessage,
} from '../gmail.client';
import type {
  PollingPlan,
  PollingTrigger,
  RunContext,
  TriggerEvent,
} from '../../../workflow';
import {
  getAccessToken,
  getMessage,
  listMessageIds,
} from '../gmail.client';
import { emailOutputFields, emailSample } from '../gmail.outputs';
import { toEmailEvent } from '../gmail.parse';

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const MAX_RESULTS = 500;
const MAX_PAGES = 5;
export const OVERLAP_SEC = 300;
const LAST_CHECK_KEY = 'last_check';
const SEEN_KEY = 'seen';

type SeenMap = Record<string, number>;

function readQuery(ctx: RunContext): string {
  return String(ctx.inputs?.query ?? '').trim();
}

function timestamp(message: GmailMessage, fallback: number): number {
  return Math.floor(Number(message.internalDate ?? fallback * 1000) / 1000);
}

export const newEmailMatchingSearch: PollingTrigger = {
  key: 'new_email_matching_search',
  name: 'New email matching search',
  description: 'Fires when a new email arrives that matches a Gmail search query.',
  type: 'polling',
  defaultIntervalSec: 60,
  inputFields: [
    {
      key: 'query',
      label: 'Search query',
      type: 'string',
      required: true,
      helpText: 'Gmail search syntax, e.g. from:boss@company.com has:attachment',
    },
  ],
  outputFields: emailOutputFields,
  sample: emailSample,

  async plan(ctx: RunContext): Promise<PollingPlan> {
    const token = getAccessToken(ctx);
    const lastCheck = await ctx.store.get<number>(LAST_CHECK_KEY);
    const since = lastCheck === undefined ? undefined : lastCheck - OVERLAP_SEC;
    const query = readQuery(ctx);
    const parts = query ? [`(${query})`] : [];
    if (since !== undefined) parts.push(`after:${since}`);
    const q = parts.join(' ');
    const params = new URLSearchParams({ q, maxResults: String(MAX_RESULTS) });
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };

    return {
      calls: [
        {
          id: 'list',
          method: 'GET',
          url: `${BASE}/messages?${params}`,
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
    const query = readQuery(ctx);
    const now = Math.floor(Date.now() / 1000);
    const lastCheck = await ctx.store.get<number>(LAST_CHECK_KEY);

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

    const nextSeen: SeenMap = {};
    for (const [id, ts] of Object.entries(seen)) {
      if (ts >= since) nextSeen[id] = ts;
    }
    for (const message of messages) {
      nextSeen[message.id] = timestamp(message, now);
    }
    await ctx.store.set(SEEN_KEY, nextSeen);
    await ctx.store.set(LAST_CHECK_KEY, now);
    return events;
  },

  async map(
    outputs: Record<string, unknown>,
    ctx: RunContext,
  ): Promise<TriggerEvent[]> {
    const messages = Array.isArray(outputs.messages)
      ? (outputs.messages as GmailMessage[])
      : [];
    const now = Math.floor(Date.now() / 1000);
    const lastCheck = await ctx.store.get<number>(LAST_CHECK_KEY);

    if (lastCheck === undefined) {
      const seen: SeenMap = {};
      for (const message of messages) seen[message.id] = timestamp(message, now);
      await ctx.store.set(SEEN_KEY, seen);
      await ctx.store.set(LAST_CHECK_KEY, now);
      return [];
    }

    const since = lastCheck - OVERLAP_SEC;
    const seen = (await ctx.store.get<SeenMap>(SEEN_KEY)) ?? {};
    const fresh = messages.filter((message) => !(message.id in seen));
    const events = fresh
      .map(toEmailEvent)
      .sort((a, b) => a.occurredAt!.localeCompare(b.occurredAt!));

    const nextSeen: SeenMap = {};
    for (const [id, ts] of Object.entries(seen)) {
      if (ts >= since) nextSeen[id] = ts;
    }
    for (const message of messages) {
      nextSeen[message.id] = timestamp(message, now);
    }
    await ctx.store.set(SEEN_KEY, nextSeen);
    await ctx.store.set(LAST_CHECK_KEY, now);
    return events;
  },

  async test(ctx: RunContext): Promise<TriggerEvent[]> {
    const token = getAccessToken(ctx);
    const params = new URLSearchParams({ q: readQuery(ctx), maxResults: '3' });
    const response = await fetch(`${BASE}/messages?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as { messages?: { id: string }[] };
    const events: TriggerEvent[] = [];
    for (const item of body.messages ?? []) {
      const message = await fetch(`${BASE}/messages/${item.id}?format=full`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      events.push(toEmailEvent((await message.json()) as GmailMessage));
    }
    return events;
  },
};
