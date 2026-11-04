import { getMongoClient, getMongoCollection } from '@core/mongo';
import { ensureYouTubeCollectionIndexes } from './collection.repository';

vi.mock('@core/mongo', () => ({ getMongoClient: vi.fn(), getMongoCollection: vi.fn() }));

describe('YouTube persistence startup validation', () => {
  const createIndex = vi.fn();
  const findOne = vi.fn();
  const command = vi.fn();
  const session = { withTransaction: vi.fn(), endSession: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getMongoCollection).mockReturnValue({ createIndex, findOne } as never);
    vi.mocked(getMongoClient).mockResolvedValue({ db: () => ({ command }), startSession: () => session } as never);
    session.withTransaction.mockImplementation(async (fn) => fn());
  });

  it('rejects standalone Mongo before worker activation', async () => {
    command.mockResolvedValue({ ok: 1 });
    await expect(ensureYouTubeCollectionIndexes()).rejects.toThrow('requires MongoDB replica-set');
    expect(findOne).not.toHaveBeenCalled();
  });

  it('checks bounded indexes and real transaction capability', async () => {
    command.mockResolvedValue({ setName: 'rs0' });
    await ensureYouTubeCollectionIndexes();
    expect(createIndex).toHaveBeenCalledWith({ completedAt: 1 }, { expireAfterSeconds: 1209600, timeoutMS: 5000 });
    expect(createIndex).toHaveBeenCalledWith({ expiresAt: 1 }, { expireAfterSeconds: 0, timeoutMS: 5000 });
    expect(findOne).toHaveBeenCalledWith({ _id: 'startup-probe' }, { session });
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it('propagates transaction authorization/capability failures before opening transport', async () => {
    command.mockResolvedValue({ msg: 'isdbgrid' });
    findOne.mockRejectedValue(new Error('transaction unavailable'));
    await expect(ensureYouTubeCollectionIndexes()).rejects.toThrow('transaction unavailable');
    expect(session.endSession).toHaveBeenCalledOnce();
  });
});
