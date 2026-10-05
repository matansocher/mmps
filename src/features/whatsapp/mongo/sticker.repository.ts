import { Binary, type Collection, type ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { WHATSAPP_DB_NAME, WHATSAPP_STICKERS_COLLECTION } from '../constants';
import type { Sticker, StickerSummary } from '../types';

const WITHOUT_DATA = { projection: { data: 0 } } as const;

function getCollection(): Collection<Sticker> {
  return getMongoCollection<Sticker>(WHATSAPP_DB_NAME, WHATSAPP_STICKERS_COLLECTION);
}

export async function ensureStickerIndexes(): Promise<void> {
  await getCollection().createIndexes([
    { key: { ownerPhone: 1, sha256: 1 }, name: 'owner_sha256', unique: true },
    { key: { ownerPhone: 1, tags: 1 }, name: 'owner_tags' },
    { key: { ownerPhone: 1, messageIds: 1 }, name: 'owner_message_ids' },
    { key: { ownerPhone: 1, lastReceivedAt: -1 }, name: 'owner_last_received' },
  ]);
}

export type CreateStickerData = Pick<Sticker, 'ownerPhone' | 'sha256' | 'mimeType' | 'animated'> & { readonly data: Buffer; readonly messageId: string };

export async function createSticker({ data, messageId, ...rest }: CreateStickerData): Promise<StickerSummary> {
  const now = new Date();
  const summary: StickerSummary = { ...rest, tags: [], messageIds: [messageId], lastReceivedAt: now, createdAt: now, updatedAt: now };
  const { insertedId } = await getCollection().insertOne({ ...summary, data: new Binary(data) });
  return { ...summary, _id: insertedId };
}

export async function findStickerBySha(ownerPhone: string, sha256: string): Promise<StickerSummary | null> {
  return getCollection().findOne({ ownerPhone, sha256 }, WITHOUT_DATA);
}

export async function findStickerByMessageId(ownerPhone: string, messageId: string): Promise<StickerSummary | null> {
  return getCollection().findOne({ ownerPhone, messageIds: messageId }, WITHOUT_DATA);
}

export async function findRecentUntaggedSticker(ownerPhone: string, since: Date): Promise<StickerSummary | null> {
  return getCollection().findOne({ ownerPhone, tags: { $size: 0 }, lastReceivedAt: { $gte: since } }, { ...WITHOUT_DATA, sort: { lastReceivedAt: -1 } });
}

export async function markStickerReceived(id: ObjectId, messageId: string): Promise<void> {
  const now = new Date();
  await getCollection().updateOne({ _id: id }, { $addToSet: { messageIds: messageId }, $set: { lastReceivedAt: now, updatedAt: now } });
}

export async function addStickerMessageId(id: ObjectId, messageId: string): Promise<void> {
  await getCollection().updateOne({ _id: id }, { $addToSet: { messageIds: messageId } });
}

export async function addStickerTags(id: ObjectId, tags: string[]): Promise<string[]> {
  const updated = await getCollection().findOneAndUpdate({ _id: id }, { $addToSet: { tags: { $each: tags } }, $set: { updatedAt: new Date() } }, { returnDocument: 'after', projection: { tags: 1 } });
  return updated?.tags ?? tags;
}

export async function deleteSticker(id: ObjectId): Promise<void> {
  await getCollection().deleteOne({ _id: id });
}

export async function countStickers(ownerPhone: string): Promise<number> {
  return getCollection().countDocuments({ ownerPhone });
}

// Best matches first: most tags in common with the query, then most recently updated.
export async function searchStickers(ownerPhone: string, words: string[], limit: number): Promise<StickerSummary[]> {
  return getCollection()
    .aggregate<StickerSummary>([
      { $match: { ownerPhone, tags: { $in: words } } },
      { $project: { data: 0 } },
      { $addFields: { score: { $size: { $setIntersection: ['$tags', words] } } } },
      { $sort: { score: -1, updatedAt: -1 } },
      { $limit: limit },
      { $project: { score: 0 } },
    ])
    .toArray();
}

export async function getRandomSticker(ownerPhone: string): Promise<StickerSummary | null> {
  const [sticker] = await getCollection()
    .aggregate<StickerSummary>([{ $match: { ownerPhone } }, { $sample: { size: 1 } }, { $project: { data: 0 } }])
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
