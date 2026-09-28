import type { Express } from 'express';
import cron from 'node-cron';
import { env } from 'node:process';
import { z } from 'zod';
import { getMongoCollection } from '@core/mongo';
import { Logger } from '@core/utils';
import { sendMiniAppReminder } from '@services/telegram';
import { progressCounts, progressFromHistory } from '@shared/mindloop/progress';
import { getRequestPlayer } from './api/auth.middleware';
import { MINDLOOP_DB_NAME } from './constants';
import { getPlayer } from './mongo';

const logger = new Logger('mindloop:reminders');
export type Reminder = { readonly _id: number; readonly enabled: boolean; readonly time: string; readonly timezone: string; readonly lastDay?: string };
const collection = () => getMongoCollection<Reminder>(MINDLOOP_DB_NAME, 'Reminders');
export const reminderSchema = z.object({
  enabled: z.boolean(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z
    .string()
    .max(80)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: value }).format();
        return true;
      } catch {
        return false;
      }
    }),
});
export function reminderLocalTime(now: Date, timezone: string): { day: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return { day: `${part('year')}-${part('month')}-${part('day')}`, minutes: Number(part('hour')) * 60 + Number(part('minute')) };
}
export function reminderDue(reminder: Reminder, now: Date): string | null {
  const { day, minutes } = reminderLocalTime(now, reminder.timezone);
  const [hour, minute] = reminder.time.split(':').map(Number);
  const delta = minutes - (hour * 60 + minute);
  return reminder.enabled && reminder.lastDay !== day && delta >= 0 && delta < 5 ? day : null;
}
export function reminderAvailable(): boolean {
  if (!env.MINDLOOP_TELEGRAM_BOT_TOKEN || !env.MINDLOOP_APP_URL) return false;
  try {
    return new URL(env.MINDLOOP_APP_URL).protocol === 'https:';
  } catch {
    return false;
  }
}
export function registerReminderRoutes(app: Express): void {
  app.get('/api/mindloop/player/reminder', async (req, res) => {
    const user = getRequestPlayer(req);
    if (!user) {
      res.status(401).json({ error: 'authentication_required' });
      return;
    }
    try {
      const saved = await collection().findOne({ _id: user.telegramUserId });
      res.json({ available: reminderAvailable(), reminder: saved ? { enabled: saved.enabled, time: saved.time, timezone: saved.timezone } : null });
    } catch {
      res.status(503).json({ error: 'reminder_unavailable' });
    }
  });
  app.put('/api/mindloop/player/reminder', async (req, res) => {
    const user = getRequestPlayer(req);
    const body = reminderSchema.safeParse(req.body);
    if (!user) {
      res.status(401).json({ error: 'authentication_required' });
      return;
    }
    if (!body.success) {
      res.status(400).json({ error: 'invalid_reminder' });
      return;
    }
    if (body.data.enabled && !reminderAvailable()) {
      res.status(503).json({ error: 'reminder_not_configured' });
      return;
    }
    try {
      await collection().updateOne({ _id: user.telegramUserId }, { $set: body.data }, { upsert: true });
      res.json({ reminder: body.data });
    } catch {
      res.status(503).json({ error: 'reminder_save_failed' });
    }
  });
}
export async function deliverDueReminders(now = new Date()): Promise<void> {
  if (!reminderAvailable()) return;
  for await (const reminder of collection().find({ enabled: true })) {
    const day = reminderDue(reminder, now);
    if (!day) continue;
    const player = await getPlayer(reminder._id);
    const completed = progressCounts(player?.progress ?? progressFromHistory(player?.history ?? [])).days[day] ?? 0;
    // Claim before sending. Never resend an ambiguous network failure or repeated DST hour.
    const claimed = await collection().findOneAndUpdate(
      { _id: reminder._id, enabled: true, time: reminder.time, timezone: reminder.timezone, lastDay: { $ne: day } },
      { $set: { lastDay: day } },
      { returnDocument: 'after' },
    );
    if (!claimed || completed >= 3) continue;
    const url = new URL(env.MINDLOOP_APP_URL!);
    url.searchParams.set('source', 'reminder');
    try {
      await sendMiniAppReminder(env.MINDLOOP_TELEGRAM_BOT_TOKEN!, reminder._id, url.href, 'A little room for play? Your fresh Mindloop mix is ready whenever you are.');
    } catch (error) {
      if ((error as { error_code?: number }).error_code === 403) await collection().updateOne({ _id: reminder._id }, { $set: { enabled: false } });
      logger.warn('A Mindloop reminder could not be delivered; it will not be retried today.');
    }
  }
}
export function startReminderScheduler(): void {
  if (env.NODE_ENV !== 'production' || !reminderAvailable()) return;
  cron.schedule(
    '* * * * *',
    async () => {
      try {
        await deliverDueReminders();
      } catch {
        logger.error('Mindloop reminder scan failed');
      }
    },
    { noOverlap: true },
  );
}
