import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Bot } from 'grammy';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';

const logger = new Logger('DailyExpensesLogScheduler');

export type LoggedExpense = {
  readonly vendor: string;
  readonly amount: number;
  readonly currency: string;
  readonly receivedAt: Date;
};

const CURRENCY_SYMBOLS: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

// In-memory buffer of expenses received via POST /api/chatbot/expenses during the day.
// Drained at 23:11 and posted to Telegram. Restart-loss is acceptable; the authoritative record
// lives in the credit-card statement that gets imported monthly via the xlsx import script.
const buffer: LoggedExpense[] = [];

export function addExpenseToDailyLog(entry: Omit<LoggedExpense, 'receivedAt'>): void {
  buffer.push({ ...entry, receivedAt: new Date() });
}

function drainBuffer(): LoggedExpense[] {
  return buffer.splice(0, buffer.length);
}

function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${amount.toFixed(2)}`;
}

function formatMessage(date: Date, items: ReadonlyArray<LoggedExpense>): string {
  const dayLabel = format(toZonedTime(date, DEFAULT_TIMEZONE), 'EEEE, d MMM');
  const lines: string[] = [`*Transactions for ${dayLabel}*`, ''];
  for (const e of items) lines.push(`• ${e.vendor} — ${formatAmount(e.amount, e.currency)}`);
  return lines.join('\n');
}

export async function dailyExpensesLog(bot: Bot): Promise<void> {
  try {
    const items = drainBuffer();
    if (items.length === 0) return;
    await sendShortenedMessage(bot, MY_USER_ID, formatMessage(new Date(), items), { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
