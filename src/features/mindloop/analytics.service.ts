import type { Express, Request, Response } from 'express';
import { createHmac } from 'node:crypto';
import { env } from 'node:process';
import { z } from 'zod';
import { getMongoCollection } from '@core/mongo';
import { getRequestPlayer } from './api/auth.middleware';
import { MINDLOOP_DB_NAME } from './constants';

const names = [
  'first_game_started',
  'app_open',
  'onboarding_started',
  'onboarding_skipped',
  'onboarding_completed',
  'game_started',
  'first_input',
  'game_completed',
  'game_abandoned',
  'replay_clicked',
  'next_round_clicked',
  'daily_session_completed',
  'goal_reached',
  'sync_failed',
  'reminder_opt_in',
  'reminder_opt_out',
  'reminder_open',
  'challenge_shared',
] as const;
const id = z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/);
const properties = z.object({
  returning: z.boolean().optional(),
  source: z.enum(['reminder', 'challenge', 'direct']).optional(),
  gameId: z.string().max(40).optional(),
  mode: z.enum(['classic', 'practice', 'daily']).optional(),
  loop: z.boolean().optional(),
  version: z.number().int().min(1).max(100),
  launch: z.enum(['telegram', 'browser']),
  width: z.number().int().min(0).max(20000),
  height: z.number().int().min(0).max(20000),
  timezone: z.string().max(80),
  score: z.number().min(0).max(1e9).optional(),
  durationMs: z.number().min(0).max(86400000).optional(),
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export const eventsSchema = z.object({
  events: z
    .array(
      z.object({
        id,
        player: id,
        session: id,
        name: z.enum(names),
        at: z
          .string()
          .datetime()
          .refine((at) => Date.parse(at) > Date.now() - 30 * 86400000 && Date.parse(at) < Date.now() + 300000),
        properties,
      }),
    )
    .min(1)
    .max(30),
});
type EventDocument = {
  readonly _id: string;
  readonly player: string;
  readonly session: string;
  readonly name: string;
  readonly at: Date;
  readonly receivedAt: Date;
  readonly properties: z.infer<typeof properties>;
};
const collection = () => getMongoCollection<EventDocument>(MINDLOOP_DB_NAME, 'Events');
const rates = new Map<string, { at: number; count: number }>();
export async function initializeAnalytics(): Promise<void> {
  await collection().createIndex({ receivedAt: 1 }, { expireAfterSeconds: 90 * 86400 });
  await collection().createIndex({ name: 1, at: 1 });
  await collection().createIndex({ player: 1, at: 1 });
}
export function registerAnalyticsRoutes(app: Express): void {
  const handler = async (req: Request, res: Response) => {
    const parsed = eventsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_events' });
      return;
    }
    const rateKey = getRequestPlayer(req)?.telegramUserId?.toString() ?? `ip:${req.ip}`;
    const now = Date.now();
    const rate = rates.get(rateKey);
    if (rate && now - rate.at < 60000 && rate.count >= 120) {
      res.status(429).json({ error: 'too_many_events' });
      return;
    }
    if (rates.size >= 5000) for (const [key, value] of rates) if (now - value.at >= 60000) rates.delete(key);
    if (rates.size >= 5000 && !rates.has(rateKey)) {
      res.status(429).json({ error: 'too_many_events' });
      return;
    }
    rates.set(rateKey, rate && now - rate.at < 60000 ? { ...rate, count: rate.count + 1 } : { at: now, count: 1 });
    const user = getRequestPlayer(req);
    const player = user
      ? `tg:${createHmac('sha256', env.MINDLOOP_TELEGRAM_BOT_TOKEN ?? 'local-development')
          .update(String(user.telegramUserId))
          .digest('hex')}`
      : null;
    try {
      await collection().bulkWrite(
        parsed.data.events.map((event) => ({
          updateOne: {
            filter: { _id: event.id },
            update: {
              $setOnInsert: {
                _id: event.id,
                player: player ?? `device:${event.player}`,
                session: event.session,
                name: event.name,
                at: new Date(event.at),
                receivedAt: new Date(),
                properties: event.properties,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
      res.status(202).json({ accepted: true });
    } catch {
      res.status(503).json({ error: 'events_unavailable' });
    }
  };
  app.post('/api/mindloop/events', handler);
  app.post('/api/mindloop/player/events', handler);
}
