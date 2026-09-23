import { getMongoCollection } from '@core/mongo';
import type { CreateDigestDeliveryData, DigestDelivery, DigestImageEntry, DigestVideoEntry, DigestVideoState } from '../types';
import { DB_NAME, PENDING_POST_TTL_SECONDS } from './constants';

function getCollection() {
  return getMongoCollection<DigestDelivery>(DB_NAME, 'DigestDelivery');
}

export async function ensureDigestDeliveryIndexes(): Promise<void> {
  const collection = getCollection();
  // One record per chat per local digest date — the uniqueness that makes the claim idempotent.
  await collection.createIndex({ chatId: 1, digestDate: 1 }, { unique: true });
  // Same explicit retention as pending posts: records expire instead of accumulating forever.
  await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: PENDING_POST_TTL_SECONDS });
}

// Creates the record once per (chatId, digestDate) with the given video selection and reads it
// back, so two concurrent digest runs converge on the SAME record and the SAME videos (the
// first writer's $setOnInsert wins; later writers get that record instead of a second one).
export async function claimDigestDelivery(data: CreateDigestDeliveryData): Promise<DigestDelivery> {
  const collection = getCollection();
  const result = await collection.findOneAndUpdate(
    { chatId: data.chatId, digestDate: data.digestDate },
    { $setOnInsert: { chatId: data.chatId, digestDate: data.digestDate, videos: data.videos, images: data.images, textDeliveredAt: null, createdAt: new Date() } },
    { upsert: true, returnDocument: 'after' },
  );
  if (!result) {
    throw new Error(`failed to claim digest delivery for chat ${data.chatId} on ${data.digestDate}`);
  }
  return result;
}

export async function getDigestDelivery(chatId: number, digestDate: string): Promise<DigestDelivery | null> {
  return getCollection().findOne({ chatId, digestDate });
}

// Marks the text digest as delivered only once (won't overwrite an earlier timestamp), so a
// restart can tell that another run already sent the text and skip re-sending it.
export async function markDigestTextDelivered(chatId: number, digestDate: string): Promise<void> {
  await getCollection().updateOne({ chatId, digestDate, textDeliveredAt: null }, { $set: { textDeliveredAt: new Date() } });
}

// Atomically moves a single video entry from `pending` to `sending` and returns it, so two
// concurrent runs can never grab the same video: only the run whose update matched the still
// `pending` entry gets it back; the other gets null.
export async function claimDigestVideo(chatId: number, digestDate: string, entryId: string): Promise<DigestVideoEntry | null> {
  const collection = getCollection();
  const result = await collection.findOneAndUpdate(
    { chatId, digestDate, videos: { $elemMatch: { entryId, state: 'pending' } } },
    { $set: { 'videos.$.state': 'sending' } },
    { returnDocument: 'after' },
  );
  if (!result) {
    return null;
  }
  return result.videos.find((video) => video.entryId === entryId) ?? null;
}

// Finalizes a claimed (`sending`) video entry to its terminal state (`sent` with a Telegram
// message id, or `link_only`). Scoped to the `sending` state so a finalize can't clobber an
// entry another path already resolved.
export async function finalizeDigestVideo(chatId: number, digestDate: string, entryId: string, state: Extract<DigestVideoState, 'sent' | 'link_only'>, telegramMessageId?: number): Promise<void> {
  const update: Record<string, unknown> = { 'videos.$.state': state };
  if (telegramMessageId !== undefined) {
    update['videos.$.telegramMessageId'] = telegramMessageId;
  }
  await getCollection().updateOne({ chatId, digestDate, videos: { $elemMatch: { entryId, state: 'sending' } } }, { $set: update });
}

// Image-album counterparts of claimDigestVideo / finalizeDigestVideo (same pending → sending → terminal lifecycle).
export async function claimDigestImage(chatId: number, digestDate: string, entryId: string): Promise<DigestImageEntry | null> {
  const result = await getCollection().findOneAndUpdate(
    { chatId, digestDate, images: { $elemMatch: { entryId, state: 'pending' } } },
    { $set: { 'images.$.state': 'sending' } },
    { returnDocument: 'after' },
  );
  return result?.images?.find((image) => image.entryId === entryId) ?? null;
}

export async function finalizeDigestImage(chatId: number, digestDate: string, entryId: string, state: Extract<DigestVideoState, 'sent' | 'link_only'>): Promise<void> {
  await getCollection().updateOne({ chatId, digestDate, images: { $elemMatch: { entryId, state: 'sending' } } }, { $set: { 'images.$.state': state } });
}
