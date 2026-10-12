import { CAMPAIGN_VERSION, emptyCloudJourney, emptyProgress } from '@shared/rewind';
import { getProgress, resetProgress, syncProgress } from './progress.repository';

const mocks = vi.hoisted(() => ({ findOneAndUpdate: vi.fn(), collection: vi.fn() }));
vi.mock('@core/mongo', () => ({ getMongoCollection: mocks.collection }));
const doc = () => ({ ...emptyCloudJourney(), _id: 123, createdAt: new Date(0), updatedAt: new Date(0) });

describe('Rewind Mongo repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.collection.mockReturnValue(mocks);
  });
  test('uses Telegram ID as the document key without leaking Mongo metadata', async () => {
    mocks.findOneAndUpdate.mockResolvedValue(doc());
    expect(await getProgress(123)).toEqual(emptyCloudJourney());
    expect(mocks.collection).toHaveBeenCalledWith('Rewind', 'ProgressV2');
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith({ _id: 123 }, expect.objectContaining({ $setOnInsert: expect.objectContaining({ epoch: 0 }) }), { upsert: true, returnDocument: 'after' });
  });
  test('retries a lost compare-and-swap and merges the concurrent result', async () => {
    const concurrent = { ...doc(), revision: 1, progress: { ...emptyProgress(), completed: { 1: { stars: 3, bestMoves: 5 } } } };
    const result = { ...concurrent, revision: 2, progress: { ...concurrent.progress, completed: { ...concurrent.progress.completed, 11: { stars: 2, bestMoves: 10 } } } };
    mocks.findOneAndUpdate.mockResolvedValueOnce(doc()).mockResolvedValueOnce(null).mockResolvedValueOnce(concurrent).mockResolvedValueOnce(result);
    const merged = await syncProgress(123, { campaignVersion: CAMPAIGN_VERSION, epoch: 0, roomRevision: 0, progress: { ...emptyProgress(), completed: { 11: { stars: 2, bestMoves: 10 } } } });
    expect(merged.journey.progress.completed).toEqual(result.progress.completed);
    expect(mocks.findOneAndUpdate.mock.calls[1][0]).toEqual({ _id: 123, epoch: 0, revision: 0 });
    expect(mocks.findOneAndUpdate.mock.calls[3][0]).toEqual({ _id: 123, epoch: 0, revision: 1 });
  });
  test('does not write an old-generation snapshot after reset', async () => {
    mocks.findOneAndUpdate.mockResolvedValue({ ...doc(), epoch: 1 });
    expect((await syncProgress(123, { campaignVersion: CAMPAIGN_VERSION, epoch: 0, roomRevision: 0, progress: emptyProgress() })).reset).toEqual(true);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });
  test('surfaces persistent concurrent writes rather than pretending to save', async () => {
    for (let i = 0; i < 5; i++) mocks.findOneAndUpdate.mockResolvedValueOnce(doc()).mockResolvedValueOnce(null);
    await expect(syncProgress(123, { campaignVersion: CAMPAIGN_VERSION, epoch: 0, roomRevision: 0, progress: emptyProgress() })).rejects.toThrow('retry');
    expect(mocks.findOneAndUpdate).toHaveBeenCalledTimes(10);
  });
  test('a reset is epoch- and revision-guarded', async () => {
    mocks.findOneAndUpdate.mockResolvedValueOnce({ ...doc(), revision: 3 }).mockResolvedValueOnce(null);
    expect(await resetProgress(123, 0)).toEqual(null);
    expect(mocks.findOneAndUpdate.mock.calls[1][0]).toEqual({ _id: 123, epoch: 0, revision: 3 });
    expect(mocks.findOneAndUpdate.mock.calls[1][1].$set).toEqual(expect.objectContaining({ epoch: 1, revision: 4, progress: emptyProgress(), room: null }));
  });
});
