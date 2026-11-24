import type { KeyValueStore } from './context.types';

export interface StoreDb {
  connectorStoreEntry: {
    findUnique(args: {
      where: { workflowId_nodeId_key: { workflowId: string; nodeId: string; key: string } };
    }): Promise<{ value: unknown } | null>;
    upsert(args: {
      where: { workflowId_nodeId_key: { workflowId: string; nodeId: string; key: string } };
      create: {
        workflowId: string;
        nodeId: string;
        key: string;
        value: object;
      };
      update: { value: object };
    }): Promise<unknown>;
    deleteMany(args: {
      where: { workflowId: string; nodeId: string; key: string };
    }): Promise<unknown>;
  };
}

export function createStore(
  db: StoreDb,
  workflowId: string,
  nodeId: string,
): KeyValueStore {
  const keyOf = (key: string) => ({ workflowId, nodeId, key });

  return {
    async get<T>(key: string): Promise<T | undefined> {
      const row = await db.connectorStoreEntry.findUnique({
        where: { workflowId_nodeId_key: keyOf(key) },
      });
      return row?.value as T | undefined;
    },
    async set(key: string, value: unknown): Promise<void> {
      await db.connectorStoreEntry.upsert({
        where: { workflowId_nodeId_key: keyOf(key) },
        create: { workflowId, nodeId, key, value: value as object },
        update: { value: value as object },
      });
    },
    async delete(key: string): Promise<void> {
      await db.connectorStoreEntry.deleteMany({ where: keyOf(key) });
    },
  };
}
