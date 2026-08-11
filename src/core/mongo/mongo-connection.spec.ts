import { env } from 'node:process';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mongoMocks = vi.hoisted(() => ({
  close: vi.fn(),
  connect: vi.fn(),
  db: vi.fn((dbName: string) => ({ collection: vi.fn(), databaseName: dbName })),
  MongoClient: vi.fn(),
}));

vi.mock('mongodb', () => ({
  MongoClient: mongoMocks.MongoClient,
}));

describe('mongo connection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    env.MONGO_DB_URL = 'mongodb://localhost:27017';
    mongoMocks.connect.mockResolvedValue(undefined);
    mongoMocks.close.mockResolvedValue(undefined);
    mongoMocks.MongoClient.mockImplementation(function () {
      return {
        close: mongoMocks.close,
        connect: mongoMocks.connect,
        db: mongoMocks.db,
      };
    });
  });

  it('reuses an existing database connection', async () => {
    const { createMongoConnection, hasMongoConnection } = await import('./mongo-connection');

    await createMongoConnection('Chatbot');
    await createMongoConnection('Chatbot');

    expect(hasMongoConnection('Chatbot')).toEqual(true);
    expect(mongoMocks.MongoClient).toHaveBeenCalledTimes(1);
    expect(mongoMocks.connect).toHaveBeenCalledTimes(1);
    expect(mongoMocks.db).toHaveBeenCalledTimes(1);
  });

  it('shares an in-flight connection between concurrent callers', async () => {
    let resolveConnection: () => void;
    mongoMocks.connect.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveConnection = resolve;
        }),
    );
    const { createMongoConnection } = await import('./mongo-connection');

    const firstConnection = createMongoConnection('Chatbot');
    const secondConnection = createMongoConnection('Chatbot');
    resolveConnection!();
    await Promise.all([firstConnection, secondConnection]);

    expect(mongoMocks.MongoClient).toHaveBeenCalledTimes(1);
    expect(mongoMocks.connect).toHaveBeenCalledTimes(1);
  });

  it('creates separate connections for different databases', async () => {
    const { createMongoConnection } = await import('./mongo-connection');

    await Promise.all([createMongoConnection('Chatbot'), createMongoConnection('Coach')]);

    expect(mongoMocks.MongoClient).toHaveBeenCalledTimes(2);
    expect(mongoMocks.db).toHaveBeenCalledWith('Chatbot');
    expect(mongoMocks.db).toHaveBeenCalledWith('Coach');
  });

  it('allows retrying after a failed connection', async () => {
    mongoMocks.connect.mockRejectedValueOnce(new Error('connection failed')).mockResolvedValueOnce(undefined);
    const { createMongoConnection, hasMongoConnection } = await import('./mongo-connection');

    await expect(createMongoConnection('Chatbot')).rejects.toThrow('connection failed');
    expect(hasMongoConnection('Chatbot')).toEqual(false);

    await createMongoConnection('Chatbot');

    expect(hasMongoConnection('Chatbot')).toEqual(true);
    expect(mongoMocks.MongoClient).toHaveBeenCalledTimes(2);
    expect(mongoMocks.close).toHaveBeenCalledTimes(1);
  });

  it('preserves the connection error when cleanup also fails', async () => {
    mongoMocks.connect.mockRejectedValueOnce(new Error('connection failed'));
    mongoMocks.close.mockRejectedValueOnce(new Error('cleanup failed'));
    const { createMongoConnection } = await import('./mongo-connection');

    await expect(createMongoConnection('Chatbot')).rejects.toThrow('connection failed');
  });
});
