import { z } from 'zod';
import { progressFromHistory } from '@shared/mindloop/progress';
import type { MindloopPlayerDocument, MindloopSyncData } from '../types';

export type MindloopApiError = { readonly error: string };
export type MindloopPlayerDto = MindloopSyncData & { readonly updatedAt: string | null };
export type MindloopPlayerResponse = { readonly player: MindloopPlayerDto };
export const EMPTY_PLAYER_DTO: MindloopPlayerDto = { bestScores: {}, favorites: [], history: [], updatedAt: null };
export function toPlayerDto(doc: MindloopPlayerDocument | null): MindloopPlayerDto {
  if (!doc) return EMPTY_PLAYER_DTO;
  return {
    bestScores: { ...doc.bestScores },
    favorites: [...doc.favorites],
    history: doc.history.map((run) => {
      const entry = { ...run };
      delete entry.receivedAt;
      return entry;
    }),
    progress: doc.progress ?? progressFromHistory(doc.history, doc.bestScores),
    favoritesUpdatedAt: doc.favoritesUpdatedAt,
    updatedAt: doc.updatedAt?.toISOString() ?? null,
  };
}
const safeKey = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-zA-Z0-9:_@.-]+$/)
  .refine((key) => !['__proto__', 'constructor', 'prototype'].includes(key));
const timestamp = z
  .string()
  .max(40)
  .refine((v) => Number.isFinite(Date.parse(v)));
const score = z.number().finite().min(0).max(10_000_000).transform(Math.round);
const countMap = z.record(safeKey, z.number().int().min(0).max(100_000_000)).refine((value) => Object.keys(value).length <= 10000);
export const progressSchema = z.object({
  sources: z.record(safeKey, z.object({ games: countMap, days: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.number().int().min(0).max(100000)) })).refine((v) => Object.keys(v).length <= 100),
  awards: z.record(safeKey, timestamp),
  records: countMap,
});
const runSchema = z.object({
  runId: z.string().min(1).max(128),
  gameId: z.string().min(1).max(64),
  score,
  at: timestamp,
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  mode: z.enum(['classic', 'practice', 'daily']).optional(),
  version: z.number().int().min(1).max(100).optional(),
  variant: safeKey.optional(),
  durationMs: z.number().min(0).max(86400000).optional(),
  stats: z
    .array(z.object({ label: z.string().max(50), value: z.string().max(100) }))
    .max(12)
    .optional(),
});
export type RecordResultBody = import('@shared/mindloop/progress').RunRecord;
export function parseRecordResultBody(body: unknown): RecordResultBody | null {
  const parsed = runSchema.safeParse(body);
  return parsed.success ? (parsed.data as RecordResultBody) : null;
}
const favoritesSchema = z.array(z.string().min(1).max(64)).max(200);
export function parseFavoritesBody(body: unknown): string[] | null {
  const result = z.object({ favorites: favoritesSchema }).safeParse(body);
  return result.success ? result.data.favorites : null;
}
export function parseSyncBody(body: unknown): MindloopSyncData | null {
  const result = z
    .object({
      bestScores: z.record(safeKey, score).default({}),
      favorites: favoritesSchema.default([]),
      history: z
        .array(runSchema.extend({ runId: z.string().min(1).max(128).optional() }))
        .max(1000)
        .default([]),
      progress: progressSchema.optional(),
      favoritesUpdatedAt: timestamp.optional(),
    })
    .safeParse(body);
  if (!result.success) return null;
  return { ...result.data, history: result.data.history.map((entry) => ({ ...entry, runId: entry.runId ?? `legacy:${entry.gameId}@${entry.at}` })) } as MindloopSyncData;
}
