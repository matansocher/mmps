import { createChatbotCheckpointer } from './checkpointer';

const { setup } = vi.hoisted(() => ({ setup: vi.fn() }));

vi.mock('@core/mongo', () => ({ getMongoClient: vi.fn(() => ({})) }));

vi.mock('@langchain/langgraph-checkpoint-mongodb', () => ({
  MongoDBSaver: class {
    setup = setup;
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
