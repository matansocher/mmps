import { Binary, type Collection, type ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { WHATSAPP_DB_NAME, WHATSAPP_STICKERS_COLLECTION } from '../constants';
import type { Sticker, StickerSummary } from '../types';

const WITHOUT_DATA = { projection: { data: 0 } } as const;

function getCollection(): Collection<Sticker> {
  return getMongoCollection<Sticker>(WHATSAPP_DB_NAME, WHATSAPP_STICKERS_COLLECTION);
}

// Indexes from when every sender had a private vault.
const LEGACY_INDEXES = ['owner_sha256', 'owner_tags', 'owner_message_ids', 'owner_last_received'];

export async function ensureStickerIndexes(): Promise<void> {
  const collection = getCollection();
  await collection.createIndexes([
    { key: { sha256: 1 }, name: 'sha256', unique: true },
    { key: { tags: 1 }, name: 'tags' },
    { key: { messageIds: 1 }, name: 'message_ids' },
    { key: { lastReceivedFrom: 1, lastReceivedAt: -1 }, name: 'last_received' },
  ]);
  await Promise.all(LEGACY_INDEXES.map((name) => collection.dropIndex(name).catch(() => undefined)));
}

export type CreateStickerData = Pick<Sticker, 'ownerPhone' | 'sha256' | 'mimeType' | 'animated'> & { readonly data: Buffer; readonly messageId: string };

export async function createSticker({ data, messageId, ...rest }: CreateStickerData): Promise<StickerSummary> {
  const now = new Date();
  const summary: StickerSummary = {
    ...rest,
    byteSize: data.length,
    tags: [],
    messageIds: [messageId],
    lastReceivedFrom: rest.ownerPhone,
    lastReceivedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await getCollection().insertOne({ ...summary, data: new Binary(data) });
  return { ...summary, _id: insertedId };
}

export async function findStickerBySha(sha256: string): Promise<StickerSummary | null> {
  return getCollection().findOne({ sha256 }, WITHOUT_DATA);
}

export async function findStickerByMessageId(messageId: string): Promise<StickerSummary | null> {
  return getCollection().findOne({ messageIds: messageId }, WITHOUT_DATA);
}

// The tagging window is per sender, so two people sending stickers at once don't tag each other's.
export async function findRecentUntaggedSticker(from: string, since: Date): Promise<StickerSummary | null> {
  return getCollection().findOne({ lastReceivedFrom: from, tags: { $size: 0 }, lastReceivedAt: { $gte: since } }, { ...WITHOUT_DATA, sort: { lastReceivedAt: -1 } });
}

export async function markStickerReceived(id: ObjectId, messageId: string, from: string): Promise<void> {
  const now = new Date();
  await getCollection().updateOne({ _id: id }, { $addToSet: { messageIds: messageId }, $set: { lastReceivedFrom: from, lastReceivedAt: now, updatedAt: now } });
}

export async function addStickerMessageId(id: ObjectId, messageId: string): Promise<void> {
  await getCollection().updateOne({ _id: id }, { $addToSet: { messageIds: messageId } });
}

export async function addStickerTags(id: ObjectId, tags: string[]): Promise<string[]> {
  const updated = await getCollection().findOneAndUpdate({ _id: id }, { $addToSet: { tags: { $each: tags } }, $set: { updatedAt: new Date() } }, { returnDocument: 'after', projection: { tags: 1 } });
  return updated?.tags ?? tags;
}

export async function removeStickerTags(id: ObjectId, tags: string[]): Promise<string[]> {
  const updated = await getCollection().findOneAndUpdate({ _id: id }, { $pull: { tags: { $in: tags } }, $set: { updatedAt: new Date() } }, { returnDocument: 'after', projection: { tags: 1 } });
  return updated?.tags ?? [];
}

export async function deleteSticker(id: ObjectId): Promise<void> {
  await getCollection().deleteOne({ _id: id });
}

export async function countStickers(): Promise<number> {
  return getCollection().countDocuments();
}

// Only stickers tagged with every query word, most recently updated first.
export async function searchStickers(words: string[], limit: number): Promise<StickerSummary[]> {
  return getCollection()
    .find({ tags: { $all: words } }, WITHOUT_DATA)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getRandomSticker(): Promise<StickerSummary | null> {
  const [sticker] = await getCollection()
    .aggregate<StickerSummary>([{ $sample: { size: 1 } }, { $project: { data: 0 } }])
    .toArray();
  return sticker ?? null;
}

export async function getStickerData(id: ObjectId): Promise<Buffer | null> {
  const sticker = await getCollection().findOne({ _id: id }, { projection: { data: 1 } });
  return sticker?.data ? Buffer.from(sticker.data.buffer) : null;
}

export async function setStickerMedia(id: ObjectId, mediaId: string): Promise<void> {
  await getCollection().updateOne({ _id: id }, { $set: { mediaId, mediaUploadedAt: new Date() } });
}

// Also drops the cached Meta upload, since it holds the old bytes.
export async function replaceStickerData(id: ObjectId, data: Buffer): Promise<void> {
  await getCollection().updateOne({ _id: id }, { $set: { data: new Binary(data), byteSize: data.length, updatedAt: new Date() }, $unset: { mediaId: '', mediaUploadedAt: '' } });
}
