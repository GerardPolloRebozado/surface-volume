import type { InputField, OutputField, PollingPlan, PollingTrigger, RunContext, TriggerEvent } from '../../../workflow';
import { contextCredential } from '../mastodon.client';

export interface MastodonPollConfig {
  key: string;
  name: string;
  description: string;
  inputFields: InputField[];
  outputFields: OutputField[];
  sample: Record<string, unknown>;
  cursorKey: string;
  path: (ctx: RunContext) => string;
  map: (item: Record<string, unknown>) => TriggerEvent;
}

function asList(outputs: Record<string, unknown>): Record<string, unknown>[] {
  const value = outputs?.items;
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function idOf(item: Record<string, unknown>): string | undefined {
  return typeof item.id === 'string' && item.id ? item.id : undefined;
}

function newest(items: Record<string, unknown>[]): string | undefined {
  const sorted = items
    .map(idOf)
    .filter((id): id is string => id !== undefined)
    .sort((a, b) => {
      try {
        const left = BigInt(a);
        const right = BigInt(b);
        return left < right ? -1 : left > right ? 1 : 0;
      } catch {
        return a < b ? -1 : a > b ? 1 : 0;
      }
    });
  return sorted.at(-1);
}

function newerThan(items: Record<string, unknown>[], cursor: string): Record<string, unknown>[] {
  return items.filter((item) => {
    const id = idOf(item);
    if (!id) return false;
    try {
      return BigInt(id) > BigInt(cursor);
    } catch {
      return id > cursor;
    }
  });
}

export function mastodonPollingTrigger(config: MastodonPollConfig): PollingTrigger {
  return {
    key: config.key,
    name: config.name,
    description: config.description,
    type: 'polling',
    defaultIntervalSec: 60,
    inputFields: config.inputFields,
    outputFields: config.outputFields,
    sample: config.sample,

    async plan(ctx: RunContext): Promise<PollingPlan> {
      const credential = contextCredential(ctx);
      const cursor = await ctx.store.get<string>(config.cursorKey);
      const url = new URL(credential.instanceUrl + config.path(ctx));
      url.searchParams.set('limit', '40');
      if (cursor) url.searchParams.set('since_id', cursor);

      return {
        calls: [
          {
            id: 'items',
            method: 'GET',
            url: url.toString(),
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${credential.accessToken}`,
            },
            outputs: { items: '$' },
          },
        ],
      };
    },

    async map(outputs: Record<string, unknown>, ctx: RunContext): Promise<TriggerEvent[]> {
      const items = asList(outputs);
      const latest = newest(items);
      const previous = await ctx.store.get<string>(config.cursorKey);

      if (previous === undefined) {
        if (latest) await ctx.store.set(config.cursorKey, latest);
        return [];
      }

      const events = newerThan(items, previous).map(config.map);
      if (latest) await ctx.store.set(config.cursorKey, latest);
      return events;
    },
  };
}
