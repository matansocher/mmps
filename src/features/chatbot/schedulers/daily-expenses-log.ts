import { endOfDay, startOfDay } from 'date-fns';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Bot } from 'grammy';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { getIngestExpensesBetween, type IngestExpense } from '@shared/expenses';

const logger = new Logger('DailyExpensesLogScheduler');

const CURRENCY_SYMBOLS: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${amount.toFixed(2)}`;
}

function formatMessage(date: Date, items: ReadonlyArray<IngestExpense>): string {
  const dayLabel = format(toZonedTime(date, DEFAULT_TIMEZONE), 'EEEE, d MMM');
  const lines: string[] = [`*Transactions for ${dayLabel}*`, ''];
  for (const e of items) lines.push(`• ${e.vendor} — ${formatAmount(e.amount, e.currency)}`);
  return lines.join('\n');
}

export async function dailyExpensesLog(bot: Bot): Promise<void> {
  try {
    const now = new Date();
    const items = await getIngestExpensesBetween(startOfDay(now), endOfDay(now));
    if (items.length === 0) return;
    await sendShortenedMessage(bot, MY_USER_ID, formatMessage(now, items), { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

