import { z } from 'zod';
import type { GlobeProgressSnapshot } from '@shared/worldly';

const globeEventSchema = z.discriminatedUnion('event', [
  z.object({ event: z.literal('opened') }),
  z.object({ event: z.literal('round_started'), mode: z.string().min(1).max(60) }),
  z.object({ event: z.literal('round_finished'), mode: z.string().min(1).max(60), score: z.number().int().min(0).max(1000), outOf: z.number().int().min(0).max(1000) }),
]);

export type GlobeEvent = z.infer<typeof globeEventSchema>;

export function parseGlobeEvent(body: unknown): GlobeEvent | null {
  const result = globeEventSchema.safeParse(body);
  return result.success ? result.data : null;
}

// Keys become Mongo field names, so keep them short and free of `.`/`$`.
const progressKey = z.string().regex(/^[^.$]{1,80}$/);
const count = z.number().min(0).max(1_000_000_000);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const globeProgressSchema = z.object({
  miles: count,
  rounds: count,
  stamps: z.record(progressKey, count),
  achievements: z.array(z.string().min(1).max(80)).max(200),
  streak: count,
  lastDaily: day.nullable(),
  daily: z.record(day, count),
});

const globeSnapshotSchema = z.object({
  progress: globeProgressSchema,
  bestScores: z.record(progressKey.startsWith('best:'), count),
});

export function parseGlobeSnapshot(body: unknown): GlobeProgressSnapshot | null {
  const result = globeSnapshotSchema.safeParse(body);
  return result.success ? (result.data as GlobeProgressSnapshot) : null;
}
