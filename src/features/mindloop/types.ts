/** A single finished game run. Mirrors the web app's PlayEntry shape. */
export type MindloopPlayEntry = {
  readonly gameId: string;
  readonly score: number;
  /** ISO timestamp of when the run finished. */
  readonly at: string;
};

/** Best single-run score per game id. */
export type MindloopBestScores = Readonly<Record<string, number>>;

/**
 * Durable, server-persisted player data. Device-only preferences (theme,
 * sound, reduced-motion) are intentionally NOT stored here — they stay in the
 * browser's localStorage.
 */
export type MindloopPlayer = {
  readonly bestScores: MindloopBestScores;
  readonly favorites: ReadonlyArray<string>;
  readonly history: ReadonlyArray<MindloopPlayEntry>;
  readonly updatedAt: Date | null;
};

export type MindloopPlayerDocument = Omit<MindloopPlayer, 'updatedAt'> & {
  /** Telegram user id, used as the document primary key. */
  readonly _id: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

/** Payload for merging a whole snapshot pushed from the client (offline sync). */
export type MindloopSyncData = {
  readonly bestScores: MindloopBestScores;
  readonly favorites: ReadonlyArray<string>;
  readonly history: ReadonlyArray<MindloopPlayEntry>;
};
