import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { buildDailySummary } from '@shared/expenses';

const logger = new Logger('ExpensesSummaryScheduler');

export async function expensesSummary(bot: Bot): Promise<void> {
  try {
    const summary = await buildDailySummary();
    if (summary.count === 0) return;

    await sendShortenedMessage(bot, MY_USER_ID, summary.text, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
