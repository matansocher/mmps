import { ObjectId } from 'mongodb';
import { getMongoClient, getMongoCollection } from '@core/mongo';
import { claimYouTubeSubscription, completeYouTubeCollection, releaseYouTubeSubscription } from './collection.repository';

vi.mock('@core/mongo', () => ({ getMongoClient: vi.fn(), getMongoCollection: vi.fn() }));

const id = new ObjectId();
const job = { version: 1 as const, subscriptionId: id.toHexString(), scheduledAt: new Date().toISOString() };
const live = { _id: id, isActive: true, updatedAt: new Date('2026-01-01') };

describe('durable YouTube collection repository', () => {
  const lease = { findOneAndUpdate: vi.fn(), updateOne: vi.fn(), deleteOne: vi.fn() };
  const ledger = { findOne: vi.fn(), insertOne: vi.fn() };
  const subscriptions = { findOne: vi.fn(), updateOne: vi.fn() };
  const pending = { updateOne: vi.fn() };
  const session = { withTransaction: vi.fn(), endSession: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getMongoCollection).mockImplementation(
      (_db, collection) => ({ YouTubeCollectionLease: lease, YouTubeCollectionJob: ledger, SocialSubscription: subscriptions, PendingPost: pending })[collection] as never,
    );
    vi.mocked(getMongoClient).mockResolvedValue({ startSession: () => session } as never);
    session.withTransaction.mockImplementation(async (fn) => fn());
    lease.updateOne.mockResolvedValue({ matchedCount: 1 });
    subscriptions.findOne.mockResolvedValue(live);
    ledger.findOne.mockResolvedValue(null);
  });

  it('treats a duplicate-key lease claim as contention, not success', async () => {
    lease.findOneAndUpdate.mockRejectedValue({ code: 11000 });
    await expect(claimYouTubeSubscription(job.subscriptionId)).rejects.toThrow('already being collected');
    expect(lease.findOneAndUpdate.mock.calls[0][0]).toMatchObject({ _id: job.subscriptionId, expiresAt: { $lte: expect.any(Date) } });
  });

  it('releases only its own lease, never a successor owner', async () => {
    await releaseYouTubeSubscription(job.subscriptionId, 'owner');
    expect(lease.deleteOne).toHaveBeenCalledWith({ _id: job.subscriptionId, owner: 'owner' }, expect.anything());
  });

  it('fences stale owners before writing anything else', async () => {
    lease.updateOne.mockResolvedValue({ matchedCount: 0 });
    await expect(completeYouTubeCollection(job, 'stale', live as never, [], null)).rejects.toThrow('lease lost');
    expect(pending.updateOne).not.toHaveBeenCalled();
    expect(ledger.insertOne).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });

  it('writes stable duplicate-safe post ids, monotonic cursor and ledger in the same transaction', async () => {
    const post = { postId: 'video', postedAt: new Date(), platform: 'youtube', username: 'channel', chatId: 1 };
    const newestAt = new Date('2026-02-01');
    await completeYouTubeCollection(job, 'owner', live as never, [post] as never, newestAt);
    const firstId = pending.updateOne.mock.calls[0][1].$setOnInsert._id;
    await completeYouTubeCollection(job, 'owner', live as never, [post] as never, newestAt);
    expect(pending.updateOne.mock.calls[1][1].$setOnInsert._id).toEqual(firstId);
    expect(pending.updateOne.mock.calls[0][0]).toEqual({ platform: 'youtube', username: 'channel', chatId: 1, postId: 'video' });
    expect(pending.updateOne.mock.calls[0][2]).toMatchObject({ session, upsert: true });
    expect(subscriptions.updateOne).toHaveBeenCalledWith({ _id: id, isActive: true }, { $max: { lastSeenAt: newestAt }, $set: { updatedAt: expect.any(Date) } }, expect.objectContaining({ session }));
    expect(ledger.insertOne).toHaveBeenCalledWith(
      { _id: `${job.subscriptionId}:${job.scheduledAt}`, completedAt: expect.any(Date), newVideos: 1, skipped: false },
      expect.objectContaining({ session }),
    );
    expect(session.withTransaction.mock.calls[0][1]).toMatchObject({ writeConcern: { w: 'majority' }, readConcern: { level: 'snapshot' } });
  });

  it('does not finalize a job if persisting posts fails', async () => {
    pending.updateOne.mockRejectedValue(new Error('database outage'));
    await expect(completeYouTubeCollection(job, 'owner', live as never, [{ postId: 'video' }] as never, new Date())).rejects.toThrow('database outage');
    expect(subscriptions.updateOne).not.toHaveBeenCalled();
    expect(ledger.insertOne).not.toHaveBeenCalled();
  });

  it('rechecks live activation inside the transaction', async () => {
    subscriptions.findOne.mockResolvedValue(null);
    await completeYouTubeCollection(job, 'owner', live as never, [{ postId: 'video' }] as never, new Date());
    expect(pending.updateOne).not.toHaveBeenCalled();
    expect(subscriptions.updateOne).not.toHaveBeenCalled();
    expect(ledger.insertOne).toHaveBeenCalledOnce();
  });

  it('rejects an edited subscription so retry reloads the cursor', async () => {
    subscriptions.findOne.mockResolvedValue({ ...live, updatedAt: new Date('2026-02-01') });
    await expect(completeYouTubeCollection(job, 'owner', live as never, [], null)).rejects.toThrow('changed');
    expect(ledger.insertOne).not.toHaveBeenCalled();
  });

  it('does not recreate pending posts after a completed job redelivery', async () => {
    ledger.findOne.mockResolvedValue({ _id: 'done' });
    await completeYouTubeCollection(job, 'owner', live as never, [{ postId: 'video' }] as never, new Date());
    expect(pending.updateOne).not.toHaveBeenCalled();
  });
});
