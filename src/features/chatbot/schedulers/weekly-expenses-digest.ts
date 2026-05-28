import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { buildWeeklyDigest } from '@shared/expenses';

const logger = new Logger('WeeklyExpensesDigestScheduler');

export async function weeklyExpensesDigest(bot: Bot): Promise<void> {
  try {
    const digest = await buildWeeklyDigest();
    if (digest.count === 0) return;
    await sendShortenedMessage(bot, MY_USER_ID, digest.text, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
