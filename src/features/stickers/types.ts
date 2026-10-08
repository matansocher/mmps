import type { Binary, ObjectId } from 'mongodb';

export type Sticker = {
  readonly _id?: ObjectId;
  readonly ownerPhone: string; // who first saved it
  readonly sha256: string; // hex sha256 of the received webp bytes, unique across the shared vault
  readonly data: Binary;
  readonly mimeType: string;
  readonly animated: boolean;
  readonly byteSize?: number; // size of data; missing on stickers saved before size limits were enforced
  readonly tags: string[];
  readonly messageIds: string[]; // wamids of chat messages showing this sticker, for quote-reply lookup
  readonly mediaId?: string; // last upload to Meta, reusable until it expires
  readonly mediaUploadedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type StickerSummary = Omit<Sticker, 'data'>;

// One document per text search, for usage dashboards and for paging results with the "עוד" button.
export type SearchEvent = {
  readonly _id?: ObjectId;
  readonly phone: string;
  readonly query: string; // raw message text
  readonly words: string[]; // normalized words the search matched on (all must match)
  readonly matchedCount: number;
  readonly matchedStickerIds: ObjectId[]; // every match, in the order they're sent; fixed for the life of the search
  readonly nextOffset: number; // index in matchedStickerIds where the next "עוד" page starts
  readonly sentStickerIds: ObjectId[];
  readonly failedCount: number;
  readonly rateLimited: boolean; // sending stopped early on Meta's pair rate limit
  readonly durationMs: number; // from handling start until the first page's last reply
  readonly createdAt: Date;
};

export type StatCount = {
  readonly value: string; // tag, word or phone
  readonly count: number;
};
