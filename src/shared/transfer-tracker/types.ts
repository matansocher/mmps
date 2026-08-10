import type { ObjectId } from 'mongodb';

// A rumour the collector has stored, still owed one or more digest appearances.
// Snapshot of the display-relevant fields so the digest doesn't need to re-fetch.
export type PendingRumour = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly rumourId: string; // app_rumour slug
  readonly reportedAt: Date; // the report timestamp used for the collector cursor
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
  readonly sentCount: number; // digests this rumour has appeared in, at its current status
};

export type CreatePendingRumourData = Omit<PendingRumour, '_id' | 'collectedAt' | 'sentCount'>;

// A rumour that has already had its full run of digest appearances at a given status.
// Keeps the feed from re-announcing a done deal every time it is re-reported.
export type SentRumour = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly rumourId: string;
  readonly status: string; // the stage that was announced; a new stage is newsworthy again
  readonly completedAt: Date;
};
