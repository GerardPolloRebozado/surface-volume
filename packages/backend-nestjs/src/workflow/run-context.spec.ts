import type { Connection } from '../generated/prisma/client';
import { toAppCredential } from './app-credential';
import { createStore, type StoreDb } from './store-adapter';

const connection = {
  id: 'connection-1',
  userId: 'user-1',
  appId: 'gmail',
  displayName: 'Gmail',
  status: 'active',
} as Connection;

describe('toAppCredential', () => {
  it('maps a connection row to an app credential', () => {
    expect(toAppCredential(connection, { accessToken: 'token' })).toEqual({
      id: 'connection-1',
      userId: 'user-1',
      appId: 'gmail',
      displayName: 'Gmail',
      status: 'active',
      credentials: { accessToken: 'token' },
    });
  });
});

describe('createStore', () => {
  const where = { workflowId: 'wf-1', nodeId: 'node-1', key: 'cursor' };

  function db(): StoreDb & { rows: Map<string, unknown> } {
    const rows = new Map<string, unknown>();
    return {
      rows,
      connectorStoreEntry: {
        async findUnique() {
          return rows.has('cursor') ? { value: rows.get('cursor') } : null;
        },
        async upsert(args) {
          rows.set('cursor', args.create.value);
          return {};
        },
        async deleteMany() {
          rows.delete('cursor');
          return {};
        },
      },
    };
  }

  it('reads, writes and deletes values', async () => {
    const storeDb = db();
    const store = createStore(storeDb, 'wf-1', 'node-1');

    expect(await store.get('cursor')).toBeUndefined();
    await store.set('cursor', { id: 42 });
    expect(await store.get('cursor')).toEqual({ id: 42 });
    await store.delete('cursor');
    expect(await store.get('cursor')).toBeUndefined();
    expect(where.key).toBe('cursor');
  });
});
