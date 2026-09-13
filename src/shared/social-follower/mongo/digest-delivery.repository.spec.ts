import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMongoCollection } from '@core/mongo';
import type { DigestVideoEntry } from '../types';
import { claimDigestDelivery, claimDigestVideo, finalizeDigestVideo, getDigestDelivery, markDigestTextDelivered } from './digest-delivery.repository';

vi.mock('@core/mongo', () => ({ getMongoCollection: vi.fn() }));

function videoEntry(entryId: string, state: DigestVideoEntry['state'] = 'pending'): DigestVideoEntry {
  return { entryId, username: 'creator', displayName: 'Creator', postId: entryId, url: `https://tiktok.com/${entryId}`, text: 'hi', state };
}

describe('claimDigestDelivery()', () => {
  const findOneAndUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoCollection).mockReturnValue({ findOneAndUpdate } as never);
  });

  it('upserts once per (chatId, digestDate) with $setOnInsert so concurrent runs converge', async () => {
    const videos = [videoEntry('a'), videoEntry('b')];
    findOneAndUpdate.mockResolvedValue({ chatId: 1, digestDate: '2026-09-13', videos, textDeliveredAt: null });

    const record = await claimDigestDelivery({ chatId: 1, digestDate: '2026-09-13', videos });

    expect(record.videos).toHaveLength(2);
    const [filter, update, options] = findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ chatId: 1, digestDate: '2026-09-13' });
    expect(update.$setOnInsert).toMatchObject({ chatId: 1, digestDate: '2026-09-13', videos, textDeliveredAt: null });
    expect(update.$setOnInsert.createdAt).toBeInstanceOf(Date);
    expect(options).toMatchObject({ upsert: true, returnDocument: 'after' });
  });

  it('throws when the upsert unexpectedly returns nothing', async () => {
    findOneAndUpdate.mockResolvedValue(null);
    await expect(claimDigestDelivery({ chatId: 1, digestDate: '2026-09-13', videos: [] })).rejects.toThrow(/failed to claim/);
  });
});

describe('markDigestTextDelivered()', () => {
  const updateOne = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoCollection).mockReturnValue({ updateOne } as never);
    updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('only sets the timestamp when it is still null (idempotent)', async () => {
    await markDigestTextDelivered(1, '2026-09-13');

    const [filter, update] = updateOne.mock.calls[0];
    expect(filter).toEqual({ chatId: 1, digestDate: '2026-09-13', textDeliveredAt: null });
    expect(update.$set.textDeliveredAt).toBeInstanceOf(Date);
  });
});

describe('claimDigestVideo()', () => {
  const findOneAndUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoCollection).mockReturnValue({ findOneAndUpdate } as never);
  });

  it('atomically flips a pending entry to sending and returns it', async () => {
    findOneAndUpdate.mockResolvedValue({ chatId: 1, digestDate: '2026-09-13', videos: [videoEntry('a', 'sending'), videoEntry('b')] });

    const entry = await claimDigestVideo(1, '2026-09-13', 'a');

    expect(entry?.entryId).toBe('a');
    const [filter, update] = findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ chatId: 1, digestDate: '2026-09-13', videos: { $elemMatch: { entryId: 'a', state: 'pending' } } });
    expect(update).toEqual({ $set: { 'videos.$.state': 'sending' } });
  });

  it('returns null when no pending entry matched (already claimed by a concurrent run)', async () => {
    findOneAndUpdate.mockResolvedValue(null);
    expect(await claimDigestVideo(1, '2026-09-13', 'a')).toBeNull();
  });
});

describe('finalizeDigestVideo()', () => {
  const updateOne = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoCollection).mockReturnValue({ updateOne } as never);
    updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('sets sent state with the telegram message id, scoped to a sending entry', async () => {
    await finalizeDigestVideo(1, '2026-09-13', 'a', 'sent', 42);

    const [filter, update] = updateOne.mock.calls[0];
    expect(filter).toEqual({ chatId: 1, digestDate: '2026-09-13', videos: { $elemMatch: { entryId: 'a', state: 'sending' } } });
    expect(update).toEqual({ $set: { 'videos.$.state': 'sent', 'videos.$.telegramMessageId': 42 } });
  });

  it('sets link_only state without a message id', async () => {
    await finalizeDigestVideo(1, '2026-09-13', 'a', 'link_only');

    const [, update] = updateOne.mock.calls[0];
    expect(update).toEqual({ $set: { 'videos.$.state': 'link_only' } });
  });
});

describe('getDigestDelivery()', () => {
  const findOne = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoCollection).mockReturnValue({ findOne } as never);
  });

  it('queries by chatId and digestDate', async () => {
    findOne.mockResolvedValue(null);
    await getDigestDelivery(7, '2026-09-13');
    expect(findOne).toHaveBeenCalledWith({ chatId: 7, digestDate: '2026-09-13' });
  });
});
