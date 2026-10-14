import type { Checkpoint, CheckpointMetadata } from '@langchain/langgraph';
import { createChatbotCheckpointer, PruningMongoDBSaver } from './checkpointer';

const { setup, put, deleteMany, collection } = vi.hoisted(() => {
  const deleteMany = vi.fn();
  return { setup: vi.fn(), put: vi.fn(), deleteMany, collection: vi.fn(() => ({ deleteMany })) };
});

vi.mock('@core/mongo', () => ({ getMongoClient: vi.fn(() => ({})) }));

vi.mock('@langchain/langgraph-checkpoint-mongodb', () => ({
  MongoDBSaver: class {
    setup = setup;
    db = { collection };
    checkpointCollectionName = 'checkpoints';
    checkpointWritesCollectionName = 'checkpoint_writes';
    put(...args: unknown[]) {
      return put(...args);
    }
  },
}));

describe('createChatbotCheckpointer()', () => {
  beforeEach(() => setup.mockReset());

  it('should fail loudly when index setup reports errors', async () => {
    setup.mockResolvedValue([new Error('index build failed')]);
    await expect(createChatbotCheckpointer()).rejects.toThrow(/setup failed/);
  });

  it('should resolve when index setup succeeds', async () => {
    setup.mockResolvedValue([]);
    await expect(createChatbotCheckpointer()).resolves.toBeDefined();
  });
});

describe('PruningMongoDBSaver.put()', () => {
  const checkpoint = { id: 'new-id' } as Checkpoint;
  const metadata = {} as CheckpointMetadata;
  const savedConfig = { configurable: { thread_id: 't1', checkpoint_id: 'new-id' } };

  beforeEach(() => {
    put.mockReset().mockResolvedValue(savedConfig);
    deleteMany.mockReset().mockResolvedValue({ deletedCount: 1 });
    collection.mockClear();
  });

  it('should delete checkpoints and writes older than the parent checkpoint', async () => {
    const saver = new PruningMongoDBSaver({} as never);
    const result = await saver.put({ configurable: { thread_id: 't1', checkpoint_ns: '', checkpoint_id: 'parent-id' } }, checkpoint, metadata);

    expect(result).toEqual(savedConfig);
    expect(collection.mock.calls).toEqual([['checkpoints'], ['checkpoint_writes']]);
    const filter = { thread_id: 't1', checkpoint_ns: '', checkpoint_id: { $lt: 'parent-id' } };
    expect(deleteMany.mock.calls).toEqual([[filter], [filter]]);
  });

  it('should not prune when there is no parent checkpoint', async () => {
    const saver = new PruningMongoDBSaver({} as never);
    await saver.put({ configurable: { thread_id: 't1' } }, checkpoint, metadata);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('should not fail the save when pruning fails', async () => {
    deleteMany.mockRejectedValue(new Error('mongo down'));
    const saver = new PruningMongoDBSaver({} as never);
    await expect(saver.put({ configurable: { thread_id: 't1', checkpoint_id: 'parent-id' } }, checkpoint, metadata)).resolves.toEqual(savedConfig);
  });
});
