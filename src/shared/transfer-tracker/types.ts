import type { ObjectId } from 'mongodb';

// A rumour the collector has stored and the digest has not yet sent.
// Snapshot of the display-relevant fields so the digest doesn't need to re-fetch.
export type PendingRumour = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly rumourId: string; // app_rumour slug
  readonly reportedAt: Date; // the report timestamp used for dedupe + cursor
  readonly summary: string | null;
  readonly status: string;
  readonly probability: number;
  readonly playerName: string | null;
  readonly playerPosition: string | null;
  readonly marketValueEur: number | null;
  readonly feeLabel: string | null;
  readonly fromClub: string | null;
  readonly toClub: string | null;
  readonly sourceName: string | null;
  readonly sourceUrl: string | null;
  readonly collectedAt: Date;
};

export type CreatePendingRumourData = Omit<PendingRumour, '_id' | 'collectedAt'>;
