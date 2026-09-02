import type { MindloopPlayEntry, MindloopPlayerDocument, MindloopSyncData } from '../types';

export type MindloopApiError = { readonly error: string };

/** Client-facing player shape (no Mongo internals). */
export type MindloopPlayerDto = {
  readonly bestScores: Record<string, number>;
  readonly favorites: string[];
  readonly history: MindloopPlayEntry[];
  readonly updatedAt: string | null;
};

export type MindloopPlayerResponse = { readonly player: MindloopPlayerDto };

export const EMPTY_PLAYER_DTO: MindloopPlayerDto = {
  bestScores: {},
  favorites: [],
  history: [],
  updatedAt: null,
};

export function toPlayerDto(doc: MindloopPlayerDocument | null): MindloopPlayerDto {
  if (!doc) return EMPTY_PLAYER_DTO;
  return {
    bestScores: { ...doc.bestScores },
    favorites: [...doc.favorites],
    history: doc.history.map((e) => ({ gameId: e.gameId, score: e.score, at: e.at })),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export type RecordResultBody = { readonly gameId: string; readonly score: number };

export function parseRecordResultBody(body: unknown): RecordResultBody | null {
  if (!body || typeof body !== 'object') return null;
  const { gameId, score } = body as Record<string, unknown>;
  if (typeof gameId !== 'string' || gameId.length === 0 || gameId.length > 64) return null;
  if (!isFiniteNumber(score) || score < 0 || score > 10_000_000) return null;
  return { gameId, score: Math.round(score) };
}

export function parseFavoritesBody(body: unknown): string[] | null {
  if (!body || typeof body !== 'object') return null;
  const { favorites } = body as Record<string, unknown>;
  if (!Array.isArray(favorites)) return null;
  if (favorites.length > 200) return null;
  if (!favorites.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 64)) return null;
  return favorites as string[];
}

function parseHistoryEntry(value: unknown): MindloopPlayEntry | null {
  if (!value || typeof value !== 'object') return null;
  const { gameId, score, at } = value as Record<string, unknown>;
  if (typeof gameId !== 'string' || gameId.length === 0 || gameId.length > 64) return null;
  if (!isFiniteNumber(score) || score < 0 || score > 10_000_000) return null;
  if (typeof at !== 'string' || Number.isNaN(Date.parse(at))) return null;
  return { gameId, score: Math.round(score), at };
}

export function parseSyncBody(body: unknown): MindloopSyncData | null {
  if (!body || typeof body !== 'object') return null;
  const { bestScores, favorites, history } = body as Record<string, unknown>;

  const scores: Record<string, number> = {};
  if (bestScores && typeof bestScores === 'object' && !Array.isArray(bestScores)) {
    for (const [gameId, score] of Object.entries(bestScores as Record<string, unknown>)) {
      if (gameId.length > 64) return null;
      if (!isFiniteNumber(score) || score < 0 || score > 10_000_000) return null;
      scores[gameId] = Math.round(score);
    }
  }

  const favs = parseFavoritesBody({ favorites }) ?? (favorites === undefined ? [] : null);
  if (favs === null) return null;

  if (history !== undefined && !Array.isArray(history)) return null;
  const hist: MindloopPlayEntry[] = [];
  if (Array.isArray(history)) {
    if (history.length > 1000) return null;
    for (const raw of history) {
      const parsed = parseHistoryEntry(raw);
      if (!parsed) return null;
      hist.push(parsed);
    }
  }

  return { bestScores: scores, favorites: favs, history: hist };
}
